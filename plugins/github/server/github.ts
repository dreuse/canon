import {
  createAppAuth,
  type GitHubAppUserAuthentication,
  type InstallationAuthOptions,
} from "@octokit/auth-app";
import { Sequelize } from "sequelize";
import type { Endpoints, OctokitResponse } from "@octokit/types";
import { Octokit, RequestError } from "octokit";
import pluralize from "pluralize";
import { getLanguageForFilename } from "@shared/editor/lib/code";
import { toError, errToString } from "@shared/utils/error";
import type { IntegrationType } from "@shared/types";
import { IntegrationService, UnfurlResourceType } from "@shared/types";
import { NotFoundError, ValidationError } from "@server/errors";
import Logger from "@server/logging/Logger";
import type { User } from "@server/models";
import { GitHubApp, Integration } from "@server/models";
import type {
  UnfurlIssueOrPR,
  UnfurlProject,
  UnfurlSignature,
  UnfurlURL,
} from "@server/types";
import type {
  CodePermalink,
  FileLocation,
  GitHubAppIdentity,
} from "../shared/GitHubUtils";
import { GitHubUtils } from "../shared/GitHubUtils";
import env from "./env";

/** The credentials of the GitHub App this instance uses. */
export interface GitHubAppConfig extends GitHubAppIdentity {
  appId: number | string;
  clientSecret: string;
  privateKey: string;
  webhookSecret?: string | null;
}

/** The access a user has to a GitHub app installation. */
export enum InstallationAccess {
  Allowed = "allowed",
  Denied = "denied",
  MissingPermission = "missing_permission",
}

type PR =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];
type Issue =
  Endpoints["GET /repos/{owner}/{repo}/issues/{issue_number}"]["response"]["data"];
type Installation =
  Endpoints["GET /app/installations/{installation_id}"]["response"]["data"];
type UserInstallation =
  Endpoints["GET /user/installations"]["response"]["data"]["installations"][number];

type ParsedIssueOrPR = {
  owner: string;
  repo: string;
  type: UnfurlResourceType.Issue | UnfurlResourceType.PR;
  id: number;
  url: string;
};

type ParsedProject = {
  owner: string;
  ownerType: "orgs" | "users";
  type: UnfurlResourceType.Project;
  projectNumber: number;
  url: string;
};

type ParsedCommit = {
  owner: string;
  repo: string;
  type: typeof COMMIT_RESOURCE;
  sha: string;
  url: string;
};

type ParsedRepo = {
  owner: string;
  repo: string;
  type: typeof REPO_RESOURCE;
  url: string;
};

type GitHubResource =
  | ParsedIssueOrPR
  | ParsedProject
  | ParsedCommit
  | ParsedRepo;

type RepoLocation = Pick<ParsedRepo, "owner" | "repo">;

type FileData =
  | Endpoints["GET /repos/{owner}/{repo}/contents/{path}"]["response"]["data"]
  | Endpoints["GET /repos/{owner}/{repo}/readme"]["response"]["data"];

type RepoOverview = {
  nameWithOwner: string;
  description: string | null;
  url: string;
  owner: { avatarUrl: string };
  defaultBranchRef: {
    name: string;
    target: {
      messageHeadline?: string;
      committedDate?: string;
      url?: string;
    } | null;
  } | null;
  pullRequests: { totalCount: number };
  latestRelease: {
    tagName: string;
    publishedAt: string | null;
    url: string;
  } | null;
};

type RepoDeployment = {
  environment: string | null;
  createdAt: string;
  ref: { name: string } | null;
  latestStatus: { state: string } | null;
};

type WorkflowRun =
  Endpoints["GET /repos/{owner}/{repo}/actions/runs"]["response"]["data"]["workflow_runs"][number];

type RepoStatus = NonNullable<UnfurlURL["statuses"]>[number];

export const MAX_SNIPPET_LINES = 200;
export const MAX_WORKFLOW_ROWS = 4;
export const MAX_ENVIRONMENT_ROWS = 4;

const COMMIT_RESOURCE = "commit";
const REPO_RESOURCE = "repo";
const WORKFLOW_RUNS_PAGE = 50;
const DEPLOYMENTS_PAGE = 30;
const REPO_OVERVIEW_QUERY = `query($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    nameWithOwner
    description
    url
    owner { avatarUrl }
    defaultBranchRef {
      name
      target { ... on Commit { messageHeadline committedDate url } }
    }
    pullRequests(states: OPEN) { totalCount }
    latestRelease { tagName publishedAt url }
  }
}`;
const DEPLOYMENTS_QUERY = `query($owner: String!, $repo: String!, $first: Int!) {
  repository(owner: $owner, name: $repo) {
    deployments(first: $first, orderBy: { field: CREATED_AT, direction: DESC }) {
      nodes {
        environment
        createdAt
        ref { name }
        latestStatus { state }
      }
    }
  }
}`;
const NOT_FOUND = 404;
const BASE64_ENCODING = "base64";
const COMMENTS_PER_PAGE = 100;
const SHORT_SHA_LENGTH = 7;
const ISO_DATE_LENGTH = 10;
const GITHUB_FAVICON_URL = "https://github.com/favicon.ico";

type GitHubProject = {
  number: number;
  title: string;
  description: string | null;
  url: string;
  createdAt: string;
  closed: boolean;
};

const requestPlugin = (octokit: Octokit) => ({
  requestRepos: () =>
    octokit.paginate.iterator(
      octokit.rest.apps.listReposAccessibleToInstallation,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    ),

  requestPR: async (params: ParsedIssueOrPR) =>
    octokit.request(`GET /repos/{owner}/{repo}/pulls/{pull_number}`, {
      owner: params.owner,
      repo: params.repo,
      pull_number: params.id,
      headers: {
        Accept: "application/vnd.github.text+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }),

  requestCommit: async (params: ParsedCommit) =>
    octokit.request(`GET /repos/{owner}/{repo}/commits/{ref}`, {
      owner: params.owner,
      repo: params.repo,
      ref: params.sha,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }),

  requestContent: async (params: CodePermalink) =>
    octokit.request(`GET /repos/{owner}/{repo}/contents/{path}`, {
      owner: params.owner,
      repo: params.repo,
      path: params.path,
      ref: params.ref,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }),

  requestReadme: async (params: RepoLocation) =>
    octokit.request(`GET /repos/{owner}/{repo}/readme`, {
      owner: params.owner,
      repo: params.repo,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }),

  requestRepoOverview: async (params: RepoLocation) =>
    (
      await octokit.graphql<{ repository: RepoOverview | null }>(
        REPO_OVERVIEW_QUERY,
        { owner: params.owner, repo: params.repo }
      )
    ).repository,

  requestDeployments: async (params: RepoLocation) =>
    (
      await octokit.graphql<{
        repository: { deployments: { nodes: RepoDeployment[] } } | null;
      }>(DEPLOYMENTS_QUERY, {
        owner: params.owner,
        repo: params.repo,
        first: DEPLOYMENTS_PAGE,
      })
    ).repository?.deployments.nodes ?? [],

  requestWorkflowRuns: async (params: RepoLocation & { branch: string }) =>
    octokit.request(`GET /repos/{owner}/{repo}/actions/runs`, {
      owner: params.owner,
      repo: params.repo,
      branch: params.branch,
      per_page: WORKFLOW_RUNS_PAGE,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }),

  requestIssue: async (params: ParsedIssueOrPR) =>
    octokit.request(`GET /repos/{owner}/{repo}/issues/{issue_number}`, {
      owner: params.owner,
      repo: params.repo,
      issue_number: params.id,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }),

  requestRepo: async (params: RepoLocation) =>
    octokit.request(`GET /repos/{owner}/{repo}`, {
      owner: params.owner,
      repo: params.repo,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }),

  requestIssueComments: (params: ParsedIssueOrPR) =>
    octokit.paginate.iterator(
      "GET /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner: params.owner,
        repo: params.repo,
        issue_number: params.id,
        per_page: COMMENTS_PER_PAGE,
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    ),

  createIssueComment: async (params: ParsedIssueOrPR, body: string) =>
    octokit.request(
      `POST /repos/{owner}/{repo}/issues/{issue_number}/comments`,
      {
        owner: params.owner,
        repo: params.repo,
        issue_number: params.id,
        body,
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    ),

  /**
   * Fetches details of a GitHub ProjectV2 using the GraphQL API.
   *
   * @param params Parsed project URL identifiers.
   * @returns Project data or undefined if not found.
   */
  requestProject: async (
    params: ParsedProject
  ): Promise<GitHubProject | undefined> => {
    const ownerField = params.ownerType === "orgs" ? "organization" : "user";

    const query = `query($login: String!, $number: Int!) {
      ${ownerField}(login: $login) {
        projectV2(number: $number) {
          number
          title
          shortDescription
          url
          createdAt
          closed
        }
      }
    }`;

    const result = await octokit.graphql<
      Record<
        string,
        {
          projectV2: {
            number: number;
            title: string;
            shortDescription: string | null;
            url: string;
            createdAt: string;
            closed: boolean;
          } | null;
        }
      >
    >(query, { login: params.owner, number: params.projectNumber });

    const project = result[ownerField]?.projectV2;
    if (!project) {
      return undefined;
    }

    return {
      number: project.number,
      title: project.title,
      description: project.shortDescription,
      url: project.url,
      createdAt: project.createdAt,
      closed: project.closed,
    };
  },

  /**
   * Fetches the authenticated user.
   *
   * @returns the user's GitHub profile.
   */
  requestAuthenticatedUser: async () =>
    octokit.rest.users.getAuthenticated({
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }),

  /**
   * Fetches the authenticated user's membership in an organization.
   *
   * @param org login of the organization.
   * @returns the membership, including role and state.
   */
  requestOrgMembership: async (org: string) =>
    octokit.rest.orgs.getMembershipForAuthenticatedUser({
      org,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }),

  /**
   * Fetches app installations accessible to the user
   *
   * @returns {Array} Containing details of all app installations done by user
   */
  requestAppInstallations: async () =>
    octokit.paginate("GET /user/installations"),

  /**
   * Fetches details of a GitHub resource, e.g, a pull request or an issue
   *
   * @param resource Contains identifiers which are used to construct resource endpoint, e.g, `/repos/{params.owner}/{params.repo}/pulls/{params.id}`
   * @returns Response containing resource details
   */
  requestResource: async function requestResource(
    resource: GitHubResource | undefined
  ): Promise<OctokitResponse<Issue | PR> | undefined> {
    switch (resource?.type) {
      case UnfurlResourceType.PR:
        return this.requestPR(resource) as Promise<OctokitResponse<PR>>;
      case UnfurlResourceType.Issue:
        return this.requestIssue(resource) as Promise<OctokitResponse<Issue>>;
      default:
        return;
    }
  },

  /**
   * Fetches details of a specific GitHub app installation
   *
   * @param installationId Id of the installation to fetch
   * @returns Response containing installation details
   */
  requestAppInstallation: async (
    installationId: number
  ): Promise<OctokitResponse<Installation>> =>
    octokit.request("GET /app/installations/{installation_id}", {
      installation_id: installationId,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }),

  /**
   * Uninstalls the GitHub app from a given target
   *
   * @param installationId Id of the target from where to uninstall
   */
  requestAppUninstall: async (installationId: number) =>
    octokit.request("DELETE /app/installations/{id}", {
      id: installationId,
    }),
});

const CustomOctokit = Octokit.plugin(requestPlugin);

type GitHubClient = InstanceType<typeof CustomOctokit>;

export class GitHub {
  private static appOctokit?: {
    appId: GitHubAppConfig["appId"];
    octokit: GitHubClient;
  };

  private static supportedResources = [
    UnfurlResourceType.Issue,
    UnfurlResourceType.PR,
  ];

  /**
   * Parses a given URL and returns resource identifiers for GitHub specific URLs
   *
   * @param url URL to parse
   * @returns {object} Containing resource identifiers - `owner`, `repo`, `type` and `id`.
   */
  public static parseUrl(url: string): GitHubResource | undefined {
    try {
      const { hostname, pathname } = new URL(url);
      if (hostname !== "github.com") {
        return;
      }

      const parts = pathname.split("/");

      // Handle project URLs: /orgs/{org}/projects/{number} or /users/{user}/projects/{number}
      if (
        (parts[1] === "orgs" || parts[1] === "users") &&
        parts[3] === "projects"
      ) {
        const ownerType = parts[1] as "orgs" | "users";
        const owner = parts[2];
        const projectNumber = Number(parts[4]);

        if (!owner || isNaN(projectNumber)) {
          return;
        }

        return {
          owner,
          ownerType,
          type: UnfurlResourceType.Project,
          projectNumber,
          url,
        };
      }

      const owner = parts[1];
      const repo = parts[2];

      if (owner && repo && !parts[3]) {
        return { owner, repo, type: REPO_RESOURCE, url };
      }

      if (parts[3] === COMMIT_RESOURCE && parts[4]) {
        return { owner, repo, type: COMMIT_RESOURCE, sha: parts[4], url };
      }

      const type = parts[3]
        ? (pluralize.singular(parts[3]) as UnfurlResourceType)
        : undefined;
      const id = Number(parts[4]);

      if (!type || !GitHub.supportedResources.includes(type) || isNaN(id)) {
        return;
      }

      return {
        owner,
        repo,
        type: type as UnfurlResourceType.Issue | UnfurlResourceType.PR,
        id,
        url,
      };
    } catch (_err) {
      // Invalid URL format
      return;
    }
  }

  /**
   * Parses a GitHub issue or pull request URL.
   *
   * @param url the URL to parse.
   * @returns the issue or pull request identifiers, or undefined for any other URL.
   */
  public static parseIssueOrPR(url: string) {
    const resource = GitHub.parseUrl(url);
    return resource && "id" in resource ? resource : undefined;
  }

  /**
   * Resolves the GitHub App credentials. Environment variables win over an
   * app created from Settings.
   *
   * @returns the app credentials, or undefined when no app is configured.
   */
  public static async config(): Promise<GitHubAppConfig | undefined> {
    if (
      env.GITHUB_APP_ID &&
      env.GITHUB_APP_NAME &&
      env.GITHUB_APP_PRIVATE_KEY &&
      env.GITHUB_CLIENT_ID &&
      env.GITHUB_CLIENT_SECRET
    ) {
      return {
        appId: env.GITHUB_APP_ID,
        slug: env.GITHUB_APP_NAME,
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        privateKey: Buffer.from(env.GITHUB_APP_PRIVATE_KEY, "base64").toString(
          "ascii"
        ),
        webhookSecret: env.GITHUB_WEBHOOK_SECRET,
      };
    }

    const app = await GitHubApp.findOne({ order: [["createdAt", "DESC"]] });
    return app
      ? {
          appId: app.appId,
          slug: app.slug,
          clientId: app.clientId,
          clientSecret: app.clientSecret,
          privateKey: app.privateKey,
          webhookSecret: app.webhookSecret,
        }
      : undefined;
  }

  /**
   * Completes the GitHub App manifest flow and stores the new app.
   *
   * @param code the temporary code GitHub returned after creating the app.
   * @returns the stored app.
   * @throws {ValidationError} if GitHub returned no app slug.
   */
  public static async createAppFromManifest(code: string) {
    const { data } = await new Octokit().rest.apps.createFromManifest({
      code,
    });
    if (!data.slug) {
      throw ValidationError("GitHub returned an app without a slug");
    }

    return GitHubApp.create({
      appId: data.id,
      slug: data.slug,
      clientId: data.client_id,
      clientSecret: data.client_secret,
      webhookSecret: data.webhook_secret,
      privateKey: data.pem,
    });
  }

  private static async authenticateAsApp() {
    const config = await GitHub.config();
    if (!config) {
      throw ValidationError("GitHub App is not configured");
    }

    if (GitHub.appOctokit?.appId !== config.appId) {
      GitHub.appOctokit = {
        appId: config.appId,
        octokit: new CustomOctokit({
          authStrategy: createAppAuth,
          auth: {
            appId: config.appId,
            privateKey: config.privateKey,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
          },
        }),
      };
    }

    return GitHub.appOctokit.octokit;
  }

  /**
   * [Authenticates as a GitHub user](https://github.com/octokit/auth-app.js/?tab=readme-ov-file#authenticate-as-installation)
   *
   * @param code Temporary code received in callback url after user authorizes
   * @param state A string received in callback url to protect against CSRF
   * @returns {Octokit} User-authenticated octokit instance
   */
  public static authenticateAsUser = async (
    code: string,
    state?: string | null
  ): Promise<GitHubClient> => {
    // Exchange the code once, the oauth-user strategy repeats it per request.
    const app = await GitHub.authenticateAsApp();
    const { token } = (await app.auth({
      type: "oauth-user",
      code,
      state,
    })) as GitHubAppUserAuthentication;
    return new CustomOctokit({ auth: token });
  };

  /**
   * [Authenticates as a GitHub app installation](https://github.com/octokit/auth-app.js/?tab=readme-ov-file#authenticate-as-installation)
   *
   * @param installationId Id of an installation
   * @returns {Octokit} Installation-authenticated octokit instance
   */
  public static authenticateAsInstallation = async (installationId: number) =>
    (await GitHub.authenticateAsApp()).auth({
      type: "installation",
      installationId,
      factory: (options: InstallationAuthOptions) =>
        new CustomOctokit({
          authStrategy: createAppAuth,
          auth: options,
        }),
    }) as Promise<GitHubClient>;

  /**
   * Checks whether the user can manage an installation. The user must be the
   * owner of a personal account, or an active admin of an organization.
   *
   * @param client user-authenticated octokit instance.
   * @param installation installation from the user's installation list.
   * @returns the access the user has to the installation.
   */
  public static async canManageInstallation(
    client: GitHubClient,
    installation: UserInstallation
  ): Promise<InstallationAccess> {
    const { account } = installation;
    if (!account || !("login" in account)) {
      return InstallationAccess.Denied;
    }

    if (installation.target_type === "User") {
      const { data: user } = await client.requestAuthenticatedUser();
      return user.id === account.id
        ? InstallationAccess.Allowed
        : InstallationAccess.Denied;
    }

    if (installation.target_type !== "Organization") {
      return InstallationAccess.Denied;
    }

    if (!installation.permissions.members) {
      return InstallationAccess.MissingPermission;
    }

    try {
      const { data: membership } = await client.requestOrgMembership(
        account.login
      );
      return membership.state === "active" && membership.role === "admin"
        ? InstallationAccess.Allowed
        : InstallationAccess.Denied;
    } catch (err) {
      if (
        err instanceof RequestError &&
        (err.status === 403 || err.status === 404)
      ) {
        return InstallationAccess.Denied;
      }
      throw err;
    }
  }

  /**
   *
   * @param url GitHub resource url
   * @param actor User attempting to unfurl resource url
   * @returns An object containing resource details e.g, a GitHub Pull Request details
   */
  public static unfurl: UnfurlSignature = async (url: string, actor?: User) => {
    const resource = GitHub.parseUrl(url);

    if (!resource || !actor) {
      return;
    }

    const integration = await GitHub.integrationForOwner(
      actor.teamId,
      resource.owner
    );

    if (!integration) {
      return;
    }

    try {
      const client = await GitHub.authenticateAsInstallation(
        integration.settings.github!.installation.id
      );

      if (resource.type === UnfurlResourceType.Project) {
        return GitHub.unfurlProject(client, resource);
      }

      if (resource.type === REPO_RESOURCE) {
        return await GitHub.unfurlRepo(client, resource);
      }

      if (resource.type === COMMIT_RESOURCE) {
        const { data: commit } = await client.requestCommit(resource);
        return {
          type: UnfurlResourceType.URL,
          url: commit.html_url,
          title: commit.commit.message.split("\n")[0],
          description: [
            commit.sha.slice(0, SHORT_SHA_LENGTH),
            commit.author?.login ?? commit.commit.author?.name,
            commit.commit.author?.date?.slice(0, ISO_DATE_LENGTH),
          ]
            .filter(Boolean)
            .join(" · "),
          thumbnailUrl: commit.author?.avatar_url ?? "",
          faviconUrl: GITHUB_FAVICON_URL,
        } satisfies UnfurlURL;
      }

      const res = await client.requestResource(resource);
      if (!res) {
        return { error: "Resource not found" };
      }

      return GitHub.transformData(res.data, resource.type);
    } catch (err) {
      Logger.warn("Failed to fetch resource from GitHub", toError(err));
      return {
        error: errToString(err) || "Unknown error",
      };
    }
  };

  /**
   * Finds the team's GitHub integration, preferring the installation on the
   * given account.
   *
   * @param teamId the team to search.
   * @param owner the GitHub account that owns the resource.
   * @returns the integration, or null when the team has none.
   */
  public static async integrationForOwner(teamId: string, owner: string) {
    return (await Integration.findOne({
      where: {
        service: IntegrationService.GitHub,
        teamId,
      },
      order: [
        [
          Sequelize.literal(
            `CASE WHEN "settings"->'github'->'installation'->'account'->>'name' = :owner THEN 0 ELSE 1 END`
          ),
          "ASC",
        ],
      ],
      replacements: { owner },
    })) as Integration<IntegrationType.Embed> | null;
  }

  /**
   * Fetches a line range of a repository file.
   *
   * @param teamId the team whose GitHub installation is used.
   * @param permalink the file location and line range.
   * @returns the code language and the selected lines.
   * @throws {NotFoundError} when the team has no integration or GitHub cannot
   * see the file.
   * @throws {ValidationError} when the file is too large or the lines are
   * outside it.
   */
  public static async snippet(teamId: string, permalink: CodePermalink) {
    const client = await GitHub.installationClient(teamId, permalink.owner);
    const { text } = await GitHub.readFile(client.requestContent(permalink));
    const lines = text.split(/\r?\n/);

    if (permalink.startLine > lines.length) {
      throw ValidationError("Line range is outside the file");
    }

    return {
      language: getLanguageForFilename(permalink.path),
      code: lines.slice(permalink.startLine - 1, permalink.endLine).join("\n"),
    };
  }

  /**
   * Fetches a repository file, or the README when no path is given.
   *
   * @param teamId the team whose GitHub installation is used.
   * @param location the repository, and the ref and path of the file.
   * @returns the file path, code language, text and GitHub URL.
   * @throws {NotFoundError} when the team has no integration or GitHub cannot
   * see the file.
   * @throws {ValidationError} when the file is too large.
   */
  public static async content(teamId: string, location: FileLocation) {
    const client = await GitHub.installationClient(teamId, location.owner);
    const { file, text } = await GitHub.readFile(
      location.path
        ? client.requestContent({
            owner: location.owner,
            repo: location.repo,
            path: location.path,
            ref: location.ref ?? "",
          } as CodePermalink)
        : client.requestReadme(location)
    );

    return {
      path: file.path,
      language: getLanguageForFilename(file.path),
      content: text,
      url: file.html_url ?? "",
    };
  }

  private static async installationClient(teamId: string, owner: string) {
    const integration = await GitHub.integrationForOwner(teamId, owner);

    if (!integration) {
      throw NotFoundError("GitHub integration not found");
    }

    return GitHub.authenticateAsInstallation(
      integration.settings.github!.installation.id
    );
  }

  private static async readFile(request: Promise<{ data: FileData }>) {
    const { data: file } = await request.catch((err: unknown) => {
      if (err instanceof RequestError && err.status === NOT_FOUND) {
        throw NotFoundError("File not found on GitHub");
      }
      throw err;
    });

    if (
      Array.isArray(file) ||
      file.type !== "file" ||
      !("encoding" in file) ||
      file.encoding !== BASE64_ENCODING
    ) {
      throw ValidationError("File is too large to read from GitHub");
    }

    return {
      file,
      text: Buffer.from(file.content, BASE64_ENCODING).toString("utf8"),
    };
  }

  private static async unfurlRepo(client: GitHubClient, resource: ParsedRepo) {
    const repo = await client.requestRepoOverview(resource);
    if (!repo) {
      return { error: "Resource not found" };
    }

    const branch = repo.defaultBranchRef?.name;
    const [runs, deployments] = await Promise.allSettled([
      branch
        ? client.requestWorkflowRuns({ ...resource, branch })
        : Promise.resolve(undefined),
      client.requestDeployments(resource),
    ]);

    return {
      type: UnfurlResourceType.URL,
      url: repo.url,
      title: repo.nameWithOwner,
      description: repo.description ?? "",
      thumbnailUrl: repo.owner.avatarUrl,
      faviconUrl: GITHUB_FAVICON_URL,
      statuses: [
        ...(runs.status === "fulfilled" && runs.value
          ? GitHub.workflowStatuses(runs.value.data.workflow_runs)
          : []),
        ...(deployments.status === "fulfilled"
          ? GitHub.deploymentStatuses(deployments.value)
          : []),
        ...GitHub.repoStatuses(repo),
      ],
    } satisfies UnfurlURL;
  }

  private static workflowStatuses(runs: WorkflowRun[]): RepoStatus[] {
    const newest = new Map<number, WorkflowRun>();
    for (const run of runs) {
      if (!newest.has(run.workflow_id)) {
        newest.set(run.workflow_id, run);
      }
    }

    return [...newest.values()].slice(0, MAX_WORKFLOW_ROWS).map((run) => {
      const state = run.conclusion ?? run.status ?? "";
      return {
        label: run.name ?? "",
        value: state,
        color: GitHubUtils.statusColor(state),
        url: run.html_url,
        timestamp: run.updated_at,
      };
    });
  }

  private static deploymentStatuses(
    deployments: RepoDeployment[]
  ): RepoStatus[] {
    const newest = new Map<string, RepoDeployment>();
    for (const deployment of deployments) {
      if (deployment.environment && !newest.has(deployment.environment)) {
        newest.set(deployment.environment, deployment);
      }
    }

    return [...newest.entries()]
      .slice(0, MAX_ENVIRONMENT_ROWS)
      .map(([environment, deployment]) => {
        const state = deployment.latestStatus?.state.toLowerCase() ?? "";
        return {
          label: environment,
          value: [state, deployment.ref?.name].filter(Boolean).join(" · "),
          color: GitHubUtils.statusColor(state),
          timestamp: deployment.createdAt,
        };
      });
  }

  private static repoStatuses(repo: RepoOverview): RepoStatus[] {
    const commit = repo.defaultBranchRef?.target;

    return [
      ...(repo.latestRelease
        ? [
            {
              label: "Release",
              value: repo.latestRelease.tagName,
              url: repo.latestRelease.url,
              timestamp: repo.latestRelease.publishedAt ?? undefined,
            },
          ]
        : []),
      {
        label: "Open pull requests",
        value: String(repo.pullRequests.totalCount),
        url: `${repo.url}/pulls`,
      },
      ...(commit?.messageHeadline
        ? [
            {
              label: "Last commit",
              value: commit.messageHeadline,
              url: commit.url,
              timestamp: commit.committedDate,
            },
          ]
        : []),
    ];
  }

  private static async unfurlProject(
    client: GitHubClient,
    resource: ParsedProject
  ) {
    let project: GitHubProject | undefined;
    try {
      project = await client.requestProject(resource);
    } catch (err) {
      Logger.warn("Failed to fetch project from GitHub", toError(err));
      return { error: "Resource not found" };
    }

    if (!project) {
      return { error: "Resource not found" };
    }

    const state = project.closed ? "completed" : "open";

    return {
      type: UnfurlResourceType.Project,
      url: project.url,
      id: `#${project.number}`,
      name: project.title,
      color: GitHubUtils.getColorForStatus(state),
      description: project.description,
      lead: null,
      state: {
        type: state,
        name: state,
        color: GitHubUtils.getColorForStatus(state),
      },
      labels: [],
      createdAt: project.createdAt,
      targetDate: null,
    } satisfies UnfurlProject;
  }

  private static transformData(data: Issue | PR, type: UnfurlResourceType) {
    if (type === UnfurlResourceType.Issue) {
      const issue = data as Issue;
      const issueState =
        issue.state === "closed"
          ? issue.state_reason === "completed"
            ? "completed"
            : "canceled"
          : issue.state;
      return {
        type: UnfurlResourceType.Issue,
        url: issue.html_url,
        id: `#${issue.number}`,
        title: issue.title,
        description: issue.body ?? null,
        author: {
          name: issue.user?.login ?? "",
          avatarUrl: issue.user?.avatar_url ?? "",
        },
        labels: GitHub.mapLabels(issue.labels),
        state: {
          name: issueState,
          color: GitHubUtils.getColorForStatus(issueState),
        },
        createdAt: issue.created_at,
      } satisfies UnfurlIssueOrPR;
    }

    const pr = data as PR;
    const prState = pr.merged ? "merged" : pr.state;
    return {
      type: UnfurlResourceType.PR,
      url: pr.html_url,
      id: `#${pr.number}`,
      title: pr.title,
      description: pr.body,
      author: {
        name: pr.user.login,
        avatarUrl: pr.user.avatar_url,
      },
      state: {
        name: prState,
        color: GitHubUtils.getColorForStatus(prState, !!pr.draft),
        draft: pr.draft,
      },
      labels: GitHub.mapLabels(pr.labels),
      createdAt: pr.created_at,
    } satisfies UnfurlIssueOrPR;
  }

  private static mapLabels(labels: Issue["labels"] | PR["labels"]) {
    return labels.flatMap((label) =>
      typeof label === "string" || !label.name
        ? []
        : [{ name: label.name, color: `#${label.color}` }]
    );
  }
}
