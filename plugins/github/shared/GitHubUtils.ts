import queryString from "query-string";
import env from "@shared/env";
import { MentionType } from "@shared/types";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export const GitHubOAuthNonceCookie = "githubOAuthNonce";

export type OAuthState = {
  teamId: string;
  nonce: string;
};

export interface GitHubAppIdentity {
  slug: string;
  clientId: string;
}

export interface CodePermalink {
  owner: string;
  repo: string;
  ref: string;
  path: string;
  startLine: number;
  endLine: number;
}

export interface FileLocation {
  owner: string;
  repo: string;
  ref?: string;
  path?: string;
}

const LINE_RANGE_REGEX = /^#L([1-9]\d*)(?:C\d+)?(?:-L([1-9]\d*)(?:C\d+)?)?$/;
const GITHUB_URL = "https://github.com";
const APP_NAME_MAX_LENGTH = 34;
const APP_PERMISSIONS = {
  contents: "read",
  issues: "write",
  members: "read",
  metadata: "read",
  organization_projects: "read",
  pull_requests: "write",
  actions: "read",
  deployments: "read",
};
const NON_REPOSITORY_OWNERS = new Set([
  "orgs",
  "users",
  "settings",
  "marketplace",
  "apps",
  "topics",
  "sponsors",
]);
const STATUS_COLORS = {
  success: "#238636",
  failure: "#f85149",
  pending: "#d29922",
  neutral: "#848d97",
};
const STATUS_OUTCOMES: Record<string, keyof typeof STATUS_COLORS> = {
  success: "success",
  active: "success",
  completed: "success",
  failure: "failure",
  error: "failure",
  timed_out: "failure",
  startup_failure: "failure",
  action_required: "failure",
  in_progress: "pending",
  queued: "pending",
  waiting: "pending",
  pending: "pending",
  requested: "pending",
};
const APP_EVENTS = ["repository"];
const MARKDOWN_LANGUAGE = "markdown";
const MIN_FENCE_LENGTH = 3;
const BACKTICK_RUNS = /`+/g;

export class GitHubUtils {
  static get url() {
    return integrationSettingsPath("github");
  }

  /**
   * @param error
   * @returns URL to be redirected to upon authorization error from GitHub
   */
  public static errorUrl(error: string) {
    return `${this.url}?error=${error}`;
  }

  /**
   * @returns Callback URL configured for GitHub, to which users will be redirected upon authorization
   */
  public static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: env.URL,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/api/github.callback?${params}`
      : `${baseUrl}/api/github.callback`;
  }

  static authUrl(state: OAuthState, app: GitHubAppIdentity): string {
    const baseUrl = `${GITHUB_URL}/apps/${app.slug}/installations/new`;
    const params = {
      client_id: app.clientId,
      redirect_uri: this.callbackUrl(),
      state: JSON.stringify(state),
    };
    return `${baseUrl}?${queryString.stringify(params)}`;
  }

  /**
   * Builds the GitHub App manifest that registers an app for this instance.
   *
   * @param appName the product name to put in the app name.
   * @param baseUrl the URL of this instance.
   * @returns the manifest to post to GitHub.
   */
  static manifest(appName: string, baseUrl: string = env.URL) {
    return {
      name: `${appName} ${new URL(baseUrl).hostname}`
        .slice(0, APP_NAME_MAX_LENGTH)
        .trim(),
      url: baseUrl,
      hook_attributes: { url: `${baseUrl}/api/github.webhooks` },
      redirect_url: `${baseUrl}/api/github.manifest`,
      callback_urls: [this.callbackUrl({ baseUrl })],
      public: false,
      request_oauth_on_install: true,
      default_permissions: APP_PERMISSIONS,
      default_events: APP_EVENTS,
    };
  }

  /**
   * @param state the OAuth state to return with the manifest code.
   * @param organization the GitHub organization to own the app, or none for
   * the user's own account.
   * @returns the GitHub URL to post the app manifest to.
   */
  static manifestUrl(state: OAuthState, organization?: string): string {
    const path = organization
      ? `/organizations/${encodeURIComponent(organization)}/settings/apps/new`
      : "/settings/apps/new";
    return `${GITHUB_URL}${path}?${queryString.stringify({
      state: JSON.stringify(state),
    })}`;
  }

  static parseState(state: string): OAuthState | undefined {
    try {
      return JSON.parse(state);
    } catch {
      return undefined;
    }
  }

  static installRequestUrl(): string {
    return `${this.url}?install_request=true`;
  }

  /**
   * Determines the type of mention a GitHub URL represents.
   *
   * @param url the URL to evaluate.
   * @returns the mention type, or undefined if this is not a GitHub URL for a
   * resource that can be mentioned.
   */
  public static mentionType(url: URL): MentionType | undefined {
    if (url.hostname !== "github.com") {
      return undefined;
    }

    const type = url.pathname.split("/")[3];

    if (GitHubUtils.isRepositoryRoot(url)) {
      return MentionType.URL;
    }

    return type === "pull"
      ? MentionType.PullRequest
      : type === "issues"
        ? MentionType.Issue
        : type === "projects"
          ? MentionType.Project
          : type === "commit"
            ? MentionType.URL
            : undefined;
  }

  /**
   * Parses a GitHub link to a line range in a file.
   *
   * @param url the URL to parse.
   * @returns the file location and line range, or undefined if the URL is not
   * a GitHub file link with a valid line range.
   */
  public static parseCodePermalink(url: URL): CodePermalink | undefined {
    const [, owner, repo, type, ref, ...segments] = url.pathname.split("/");
    const lines = LINE_RANGE_REGEX.exec(url.hash);

    if (
      url.hostname !== "github.com" ||
      type !== "blob" ||
      !ref ||
      !segments.length ||
      !lines
    ) {
      return undefined;
    }

    const startLine = Number(lines[1]);
    const endLine = lines[2] ? Number(lines[2]) : startLine;

    if (endLine < startLine) {
      return undefined;
    }

    try {
      const path = segments.map(decodeURIComponent).join("/");
      return { owner, repo, ref, path, startLine, endLine };
    } catch {
      return undefined;
    }
  }

  /**
   * Parses a GitHub link to a repository file, or to a repository root,
   * which stands for its README.
   *
   * @param url the URL to parse.
   * @returns the file location, without a path for a repository root, or
   * undefined for any other link.
   */
  public static parseFileUrl(url: URL): FileLocation | undefined {
    if (url.hostname !== "github.com") {
      return undefined;
    }

    const [, owner, repo] = url.pathname.split("/");

    if (GitHubUtils.isRepositoryRoot(url)) {
      return { owner, repo };
    }

    const [, , , type, ref, ...segments] = url.pathname.split("/");

    if (
      NON_REPOSITORY_OWNERS.has(owner) ||
      type !== "blob" ||
      !ref ||
      !segments.length
    ) {
      return undefined;
    }

    try {
      const path = segments.map(decodeURIComponent).join("/");
      return { owner, repo, ref, path };
    } catch {
      return undefined;
    }
  }

  /**
   * Builds the Markdown shown for a repository file. Markdown files are used
   * as they are, and code is wrapped in a fence longer than any backtick run
   * inside it.
   *
   * @param file the code language and text of the file.
   * @param range the lines to keep, when only part of the file is shown.
   * @returns the Markdown for the file.
   */
  public static fileMarkdown(
    file: { language: string; content: string },
    range?: Pick<CodePermalink, "startLine" | "endLine">
  ) {
    if (file.language === MARKDOWN_LANGUAGE && !range) {
      return file.content;
    }

    const code = range
      ? file.content
          .split(/\r?\n/)
          .slice(range.startLine - 1, range.endLine)
          .join("\n")
      : file.content;
    const longestRun = Math.max(
      0,
      ...(code.match(BACKTICK_RUNS) ?? []).map((run) => run.length)
    );
    const fence = "`".repeat(Math.max(MIN_FENCE_LENGTH, longestRun + 1));
    return `${fence}${file.language}\n${code}\n${fence}`;
  }

  /**
   * Picks the color for the state of a workflow run or a deployment.
   *
   * @param state the state, status or conclusion reported by GitHub.
   * @returns a color for success, failure, pending or anything else.
   */
  public static statusColor(state: string) {
    return STATUS_COLORS[STATUS_OUTCOMES[state.toLowerCase()] ?? "neutral"];
  }

  private static isRepositoryRoot(url: URL) {
    const [, owner, repo, rest] = url.pathname.split("/");
    return (
      url.hostname === "github.com" &&
      !!owner &&
      !!repo &&
      !rest &&
      !NON_REPOSITORY_OWNERS.has(owner)
    );
  }

  public static getColorForStatus(status: string, isDraftPR: boolean = false) {
    switch (status) {
      case "open":
        return isDraftPR ? "#848d97" : "#238636";
      case "done":
        return "#a371f7";
      case "closed":
        return "#f85149";
      case "completed":
      case "merged":
        return "#8250df";
      case "canceled":
      default:
        return "#848d97";
    }
  }
}
