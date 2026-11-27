import { RequestError } from "octokit";
import { IntegrationService, IntegrationType } from "@shared/types";
import { buildIntegration, buildUser } from "@server/test/factories";
import {
  GitHub,
  InstallationAccess,
  MAX_ENVIRONMENT_ROWS,
  MAX_WORKFLOW_ROWS,
} from "./github";

type Client = Parameters<typeof GitHub.canManageInstallation>[0];
type UserInstallation = Parameters<typeof GitHub.canManageInstallation>[1];
type InstallationClient = Awaited<
  ReturnType<typeof GitHub.authenticateAsInstallation>
>;

function buildInstallation(
  targetType: string,
  permissions: Record<string, string> = {}
) {
  return {
    id: 1,
    target_type: targetType,
    account: { id: 100, login: "acme" },
    permissions,
  } as unknown as UserInstallation;
}

function buildClient({
  userId = 100,
  membership,
}: {
  userId?: number;
  membership?: { state: string; role: string } | RequestError;
}) {
  return {
    requestAuthenticatedUser: async () => ({ data: { id: userId } }),
    requestOrgMembership: async () => {
      if (membership instanceof RequestError) {
        throw membership;
      }
      return { data: membership };
    },
  } as unknown as Client;
}

function buildRequestError(status: number) {
  return new RequestError("error", status, {
    request: { method: "GET", url: "https://api.github.com", headers: {} },
  });
}

describe("GitHub.canManageInstallation", () => {
  it("should allow the owner of a personal account", async () => {
    const client = buildClient({ userId: 100 });
    expect(
      await GitHub.canManageInstallation(client, buildInstallation("User"))
    ).toBe(InstallationAccess.Allowed);
  });

  it("should deny another user on a personal account", async () => {
    const client = buildClient({ userId: 200 });
    expect(
      await GitHub.canManageInstallation(client, buildInstallation("User"))
    ).toBe(InstallationAccess.Denied);
  });

  it("should allow an active organization admin", async () => {
    const client = buildClient({
      membership: { state: "active", role: "admin" },
    });
    expect(
      await GitHub.canManageInstallation(
        client,
        buildInstallation("Organization", { members: "read" })
      )
    ).toBe(InstallationAccess.Allowed);
  });

  it("should deny an organization member who is not an admin", async () => {
    const client = buildClient({
      membership: { state: "active", role: "member" },
    });
    expect(
      await GitHub.canManageInstallation(
        client,
        buildInstallation("Organization", { members: "read" })
      )
    ).toBe(InstallationAccess.Denied);
  });

  it("should deny a pending organization admin", async () => {
    const client = buildClient({
      membership: { state: "pending", role: "admin" },
    });
    expect(
      await GitHub.canManageInstallation(
        client,
        buildInstallation("Organization", { members: "read" })
      )
    ).toBe(InstallationAccess.Denied);
  });

  it("should deny a user outside the organization", async () => {
    const client = buildClient({ membership: buildRequestError(404) });
    expect(
      await GitHub.canManageInstallation(
        client,
        buildInstallation("Organization", { members: "read" })
      )
    ).toBe(InstallationAccess.Denied);
  });

  it("should report a missing members permission", async () => {
    const client = buildClient({
      membership: { state: "active", role: "admin" },
    });
    expect(
      await GitHub.canManageInstallation(
        client,
        buildInstallation("Organization")
      )
    ).toBe(InstallationAccess.MissingPermission);
  });

  it("should deny an installation on an enterprise", async () => {
    const client = buildClient({});
    expect(
      await GitHub.canManageInstallation(
        client,
        buildInstallation("Enterprise")
      )
    ).toBe(InstallationAccess.Denied);
  });
});

describe("GitHub.unfurl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function unfurlWith(url: string, data: Record<string, unknown>) {
    const user = await buildUser();
    await buildIntegration({
      service: IntegrationService.GitHub,
      type: IntegrationType.Embed,
      teamId: user.teamId,
      settings: {
        github: {
          installation: {
            id: 1,
            account: { id: 1, name: "acme", avatarUrl: "" },
          },
        },
      },
    });
    vi.spyOn(GitHub, "authenticateAsInstallation").mockResolvedValue({
      requestResource: async () => ({ data }),
      requestCommit: async () => ({ data }),
    } as unknown as InstallationClient);
    return GitHub.unfurl(url, user);
  }

  it("should keep the markdown body of an issue", async () => {
    const result = await unfurlWith("https://github.com/acme/app/issues/1", {
      html_url: "https://github.com/acme/app/issues/1",
      number: 1,
      title: "Bug",
      body: "**bold**",
      state: "open",
      user: { login: "octocat", avatar_url: "" },
      labels: [],
      created_at: "2026-01-01T00:00:00Z",
    });

    expect(result).toMatchObject({ description: "**bold**" });
  });

  it("should include the labels of a pull request", async () => {
    const result = await unfurlWith("https://github.com/acme/app/pull/2", {
      html_url: "https://github.com/acme/app/pull/2",
      number: 2,
      title: "Fix",
      body: null,
      state: "open",
      merged: false,
      draft: false,
      user: { login: "octocat", avatar_url: "" },
      labels: [{ name: "bug", color: "d73a4a" }],
      created_at: "2026-01-01T00:00:00Z",
    });

    expect(result).toMatchObject({
      labels: [{ name: "bug", color: "#d73a4a" }],
    });
  });

  it("should unfurl a commit as a link", async () => {
    const result = await unfurlWith(
      "https://github.com/acme/app/commit/0123456789abcdef",
      {
        sha: "0123456789abcdef",
        html_url: "https://github.com/acme/app/commit/0123456789abcdef",
        commit: {
          message: "Fix login\n\nLonger body",
          author: { name: "Octo Cat", date: "2026-01-02T03:04:05Z" },
        },
        author: { login: "octocat", avatar_url: "https://avatars/octocat" },
      }
    );

    expect(result).toMatchObject({
      type: "url",
      url: "https://github.com/acme/app/commit/0123456789abcdef",
      title: "Fix login",
      description: "0123456 · octocat · 2026-01-02",
      thumbnailUrl: "https://avatars/octocat",
    });
  });
});

describe("GitHub repository unfurl", () => {
  const overview = {
    nameWithOwner: "acme/app",
    description: "The app",
    url: "https://github.com/acme/app",
    owner: { avatarUrl: "https://avatars/acme" },
    defaultBranchRef: {
      name: "main",
      target: {
        messageHeadline: "Fix login",
        committedDate: "2026-01-02T00:00:00Z",
        url: "https://github.com/acme/app/commit/abc",
      },
    },
    pullRequests: { totalCount: 4 },
    latestRelease: {
      tagName: "v1.2.0",
      publishedAt: "2026-01-01T00:00:00Z",
      url: "https://github.com/acme/app/releases/tag/v1.2.0",
    },
  };

  const run = (
    workflowId: number,
    name: string,
    conclusion: string | null
  ) => ({
    workflow_id: workflowId,
    name,
    status: conclusion ? "completed" : "in_progress",
    conclusion,
    html_url: `https://github.com/acme/app/actions/runs/${workflowId}`,
    updated_at: "2026-01-03T00:00:00Z",
  });

  const deployment = (environment: string, state: string) => ({
    environment,
    createdAt: "2026-01-04T00:00:00Z",
    ref: { name: "main" },
    latestStatus: { state },
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function unfurlRepo({
    runs = Promise.resolve({ data: { workflow_runs: [] as unknown[] } }),
    deployments = Promise.resolve([] as unknown[]),
  }: {
    runs?: Promise<unknown>;
    deployments?: Promise<unknown>;
  }) {
    const user = await buildUser();
    await buildIntegration({
      service: IntegrationService.GitHub,
      type: IntegrationType.Embed,
      teamId: user.teamId,
      settings: {
        github: {
          installation: {
            id: 1,
            account: { id: 1, name: "acme", avatarUrl: "" },
          },
        },
      },
    });
    vi.spyOn(GitHub, "authenticateAsInstallation").mockResolvedValue({
      requestRepoOverview: async () => overview,
      requestWorkflowRuns: () => runs,
      requestDeployments: () => deployments,
    } as unknown as InstallationClient);
    return GitHub.unfurl("https://github.com/acme/app", user);
  }

  it("should show delivery signals on a link card", async () => {
    const result = await unfurlRepo({
      runs: Promise.resolve({
        data: {
          workflow_runs: [
            run(1, "CI", "success"),
            run(1, "CI", "failure"),
            run(2, "Deploy", null),
          ],
        },
      }),
      deployments: Promise.resolve([
        deployment("production", "ACTIVE"),
        deployment("production", "FAILURE"),
        deployment("staging", "FAILURE"),
      ]),
    });

    expect(result).toMatchObject({
      type: "url",
      url: "https://github.com/acme/app",
      title: "acme/app",
      description: "The app",
      thumbnailUrl: "https://avatars/acme",
    });
    expect(
      (result as { statuses: { label: string; value: string }[] }).statuses.map(
        (status) => [status.label, status.value]
      )
    ).toEqual([
      ["CI", "success"],
      ["Deploy", "in_progress"],
      ["production", "active · main"],
      ["staging", "failure · main"],
      ["Release", "v1.2.0"],
      ["Open pull requests", "4"],
      ["Last commit", "Fix login"],
    ]);
  });

  it("should cap workflow and environment rows", async () => {
    const result = await unfurlRepo({
      runs: Promise.resolve({
        data: {
          workflow_runs: Array.from({ length: MAX_WORKFLOW_ROWS + 2 }, (_, i) =>
            run(i, `W${i}`, "success")
          ),
        },
      }),
      deployments: Promise.resolve(
        Array.from({ length: MAX_ENVIRONMENT_ROWS + 2 }, (_, i) =>
          deployment(`env${i}`, "ACTIVE")
        )
      ),
    });
    const labels = (result as { statuses: { label: string }[] }).statuses.map(
      (status) => status.label
    );

    expect(labels.filter((label) => label.startsWith("W"))).toHaveLength(
      MAX_WORKFLOW_ROWS
    );
    expect(labels.filter((label) => label.startsWith("env"))).toHaveLength(
      MAX_ENVIRONMENT_ROWS
    );
  });

  it("should keep the card when runs and deployments are forbidden", async () => {
    const result = await unfurlRepo({
      runs: Promise.reject(buildRequestError(403)),
      deployments: Promise.reject(buildRequestError(403)),
    });

    expect(
      (result as { statuses: { label: string }[] }).statuses.map(
        (status) => status.label
      )
    ).toEqual(["Release", "Open pull requests", "Last commit"]);
  });
});

describe("GitHub.content", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const file = (path: string, text: string) => ({
    data: {
      type: "file",
      encoding: "base64",
      path,
      html_url: `https://github.com/acme/app/blob/main/${path}`,
      content: Buffer.from(text).toString("base64"),
    },
  });

  async function connectedTeam(client: Record<string, unknown>) {
    const user = await buildUser();
    await buildIntegration({
      service: IntegrationService.GitHub,
      type: IntegrationType.Embed,
      teamId: user.teamId,
      settings: {
        github: {
          installation: {
            id: 1,
            account: { id: 1, name: "acme", avatarUrl: "" },
          },
        },
      },
    });
    vi.spyOn(GitHub, "authenticateAsInstallation").mockResolvedValue(
      client as unknown as InstallationClient
    );
    return user.teamId;
  }

  it("should read the README of a repository", async () => {
    const teamId = await connectedTeam({
      requestReadme: async () => file("README.md", "# App"),
    });

    expect(
      await GitHub.content(teamId, { owner: "acme", repo: "app" })
    ).toEqual({
      path: "README.md",
      language: "markdown",
      content: "# App",
      url: "https://github.com/acme/app/blob/main/README.md",
    });
  });

  it("should read a file on a ref", async () => {
    const teamId = await connectedTeam({
      requestContent: async () => file("src/index.ts", "export {};"),
    });

    expect(
      await GitHub.content(teamId, {
        owner: "acme",
        repo: "app",
        ref: "main",
        path: "src/index.ts",
      })
    ).toMatchObject({ language: "typescript", content: "export {};" });
  });

  it("should report a missing file as not found", async () => {
    const teamId = await connectedTeam({
      requestContent: async () => {
        throw buildRequestError(404);
      },
    });

    await expect(
      GitHub.content(teamId, {
        owner: "acme",
        repo: "app",
        ref: "main",
        path: "gone.md",
      })
    ).rejects.toMatchObject({ id: "not_found" });
  });

  it("should reject a file GitHub does not return inline", async () => {
    const teamId = await connectedTeam({
      requestContent: async () => ({
        data: { type: "file", encoding: "none", content: "" },
      }),
    });

    await expect(
      GitHub.content(teamId, {
        owner: "acme",
        repo: "app",
        ref: "main",
        path: "big.md",
      })
    ).rejects.toMatchObject({ id: "validation_error" });
  });
});
