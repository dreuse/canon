import crypto from "node:crypto";
import { http, HttpResponse } from "msw";
import { RequestError } from "octokit";
import { IntegrationService, IntegrationType } from "@shared/types";
import { GitHubApp, Integration } from "@server/models";
import { sequelize } from "@server/storage/database";
import {
  buildAdmin,
  buildGuestUser,
  buildIntegration,
  buildTeam,
  buildUser,
  buildViewer,
} from "@server/test/factories";
import { server as githubApi } from "@server/test/msw";
import {
  getTestServer,
  setCloudHosted,
  setSelfHosted,
} from "@server/test/support";
import env from "../env";
import { GitHub, InstallationAccess, MAX_SNIPPET_LINES } from "../github";
import GitHubWebhookTask from "../tasks/GitHubWebhookTask";
import { SetupAction } from "./schema";

const server = getTestServer();

describe("#github.callback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should reject an installation the user cannot manage", async () => {
    const user = await buildAdmin();
    const state = JSON.stringify({ teamId: user.teamId, nonce: "nonce" });
    const client = {
      requestAppInstallations: async () => [
        { id: 1, permissions: { issues: "read" }, account: null },
      ],
    } as unknown as Awaited<ReturnType<typeof GitHub.authenticateAsUser>>;
    vi.spyOn(GitHub, "authenticateAsUser").mockResolvedValue(client);
    const spy = vi
      .spyOn(GitHub, "canManageInstallation")
      .mockResolvedValue(InstallationAccess.Denied);

    const res = await server.get(
      `/api/github.callback?state=${encodeURIComponent(
        state
      )}&code=123&setup_action=${SetupAction.install}&installation_id=1`,
      user,
      {
        redirect: "manual",
        headers: { Cookie: "githubOAuthNonce=nonce" },
      }
    );

    expect(res.status).toEqual(302);
    expect(res.headers.get("location")).toContain("error=denied");
    expect(spy).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ id: 1 })
    );
    expect(
      await Integration.count({
        where: { teamId: user.teamId, service: IntegrationService.GitHub },
      })
    ).toEqual(0);
  });

  it("should reject callback when state cookie is missing", async () => {
    const user = await buildUser();
    const state = JSON.stringify({
      teamId: user.teamId,
      nonce: "state-nonce",
    });
    const res = await server.get(
      `/api/github.callback?state=${encodeURIComponent(
        state
      )}&code=123&setup_action=${SetupAction.install}&installation_id=1`,
      user,
      { redirect: "manual" }
    );
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.error).toEqual("state_mismatch");
    expect(body.message).toEqual("OAuth state cookie was missing");
  });

  it("should reject callback when state nonce does not match cookie", async () => {
    const user = await buildUser();
    const state = JSON.stringify({
      teamId: user.teamId,
      nonce: "attacker-nonce",
    });
    const res = await server.get(
      `/api/github.callback?state=${encodeURIComponent(
        state
      )}&code=123&setup_action=${SetupAction.install}&installation_id=1`,
      user,
      {
        redirect: "manual",
        headers: { Cookie: "githubOAuthNonce=cookie-nonce" },
      }
    );
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.error).toEqual("state_mismatch");
    expect(body.message).toEqual("State returned in OAuth flow did not match");
  });

  it("should reject callback when nonce is missing from state", async () => {
    const user = await buildUser();
    const state = JSON.stringify({ teamId: user.teamId });
    const res = await server.get(
      `/api/github.callback?state=${encodeURIComponent(
        state
      )}&code=123&setup_action=${SetupAction.install}&installation_id=1`,
      user,
      {
        redirect: "manual",
        headers: { Cookie: "githubOAuthNonce=cookie-nonce" },
      }
    );
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.error).toEqual("state_mismatch");
    expect(body.message).toEqual("State returned in OAuth flow was missing");
  });

  it("should fail when state is not valid JSON", async () => {
    const user = await buildUser();
    const res = await server.get(
      `/api/github.callback?state=bad&code=123&setup_action=${SetupAction.install}&installation_id=1`,
      user,
      { redirect: "manual" }
    );
    expect(res.status).toEqual(400);
  });

  it.each([
    ["member", buildUser],
    ["viewer", buildViewer],
  ])("should not allow a %s to create an integration", async (_, build) => {
    const user = await build();
    const state = JSON.stringify({ teamId: user.teamId, nonce: "nonce" });
    const res = await server.get(
      `/api/github.callback?state=${encodeURIComponent(state)}&code=123&setup_action=${SetupAction.install}&installation_id=1`,
      user,
      {
        redirect: "manual",
        headers: { Cookie: "githubOAuthNonce=nonce" },
      }
    );
    expect(res.status).toEqual(403);
  });
});

describe("#integrations.list", () => {
  it("should expose the github settings of the integration", async () => {
    const team = await buildTeam();
    const member = await buildUser({ teamId: team.id });
    const installation = {
      id: 1,
      account: { id: 2, name: "outline", avatarUrl: "https://example.com" },
    };
    await buildIntegration({
      userId: member.id,
      teamId: team.id,
      service: IntegrationService.GitHub,
      type: IntegrationType.Embed,
      settings: {
        github: { installation },
        url: "https://example.com",
      },
    });

    const res = await server.post("/api/integrations.list", member);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data[0].settings).toEqual({
      url: "https://example.com",
      github: { installation },
    });
  });

  it("should not expose github settings to guests", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const guest = await buildGuestUser({ teamId: team.id });
    await buildIntegration({
      userId: admin.id,
      teamId: team.id,
      service: IntegrationService.GitHub,
      type: IntegrationType.Embed,
      settings: {
        url: "https://example.com",
        github: {
          installation: {
            id: 123,
            account: { id: 456, name: "acme", avatarUrl: "" },
          },
        },
      },
    });

    const res = await server.post("/api/integrations.list", guest);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data[0].settings).toEqual({ url: "https://example.com" });
  });
});

describe("#github.snippet", () => {
  const FILE = ["one", "two", "three", "four"].join("\n");
  const permalink = (range: string) =>
    `https://github.com/acme/app/blob/abc123/src/index.ts#${range}`;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function buildConnectedUser() {
    const user = await buildUser();
    await buildIntegration({
      userId: user.id,
      teamId: user.teamId,
      service: IntegrationService.GitHub,
      type: IntegrationType.Embed,
      settings: {
        url: "https://github.com/acme",
        github: {
          installation: {
            id: 1,
            account: { id: 2, name: "acme", avatarUrl: "" },
          },
        },
      },
    });
    return user;
  }

  function stubContent(requestContent: () => Promise<unknown>) {
    vi.spyOn(GitHub, "authenticateAsInstallation").mockResolvedValue({
      requestContent,
    } as unknown as Awaited<
      ReturnType<typeof GitHub.authenticateAsInstallation>
    >);
  }

  const fileResponse =
    (content: string, encoding = "base64") =>
    async () => ({
      data: { type: "file", encoding, content },
    });

  it("should return the selected lines and language", async () => {
    const user = await buildConnectedUser();
    stubContent(fileResponse(Buffer.from(FILE).toString("base64")));

    const res = await server.post("/api/github.snippet", user, {
      body: { url: permalink("L2-L3") },
    });

    expect(res.status).toEqual(200);
    expect((await res.json()).data).toEqual({
      language: "typescript",
      code: "two\nthree",
    });
  });

  it("should reject a range above the line limit", async () => {
    const user = await buildConnectedUser();

    const res = await server.post("/api/github.snippet", user, {
      body: { url: permalink(`L1-L${MAX_SNIPPET_LINES + 1}`) },
    });

    expect(res.status).toEqual(400);
  });

  it("should reject a link without a line range", async () => {
    const user = await buildConnectedUser();

    const res = await server.post("/api/github.snippet", user, {
      body: { url: "https://github.com/acme/app/blob/abc123/src/index.ts" },
    });

    expect(res.status).toEqual(400);
  });

  it("should reject a file GitHub does not return inline", async () => {
    const user = await buildConnectedUser();
    stubContent(fileResponse("", "none"));

    const res = await server.post("/api/github.snippet", user, {
      body: { url: permalink("L1") },
    });

    expect(res.status).toEqual(400);
    expect((await res.json()).message).toContain("too large");
  });

  it("should reject lines outside the file", async () => {
    const user = await buildConnectedUser();
    stubContent(fileResponse(Buffer.from(FILE).toString("base64")));

    const res = await server.post("/api/github.snippet", user, {
      body: { url: permalink("L9") },
    });

    expect(res.status).toEqual(400);
  });

  it("should answer not found when GitHub cannot see the file", async () => {
    const user = await buildConnectedUser();
    stubContent(async () => {
      throw new RequestError("Not Found", 404, {
        request: { method: "GET", url: "https://api.github.com", headers: {} },
      });
    });

    const res = await server.post("/api/github.snippet", user, {
      body: { url: permalink("L1") },
    });

    expect(res.status).toEqual(404);
  });

  it("should answer not found without a GitHub integration", async () => {
    const user = await buildUser();

    const res = await server.post("/api/github.snippet", user, {
      body: { url: permalink("L1") },
    });

    expect(res.status).toEqual(404);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/github.snippet", {
      body: { url: permalink("L1") },
    });

    expect(res.status).toEqual(401);
  });
});

describe("#github.content", () => {
  const README_URL = "https://github.com/acme/app";

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function buildConnectedUser(build = buildUser) {
    const user = await build();
    await buildIntegration({
      userId: user.id,
      teamId: user.teamId,
      service: IntegrationService.GitHub,
      type: IntegrationType.Embed,
      settings: {
        url: "https://github.com/acme",
        github: {
          installation: {
            id: 1,
            account: { id: 2, name: "acme", avatarUrl: "" },
          },
        },
      },
    });
    return user;
  }

  function stubReadme() {
    const requestReadme = vi.fn(async () => ({
      data: {
        type: "file",
        encoding: "base64",
        path: "README.md",
        html_url: "https://github.com/acme/app/blob/main/README.md",
        content: Buffer.from("# App").toString("base64"),
      },
    }));
    vi.spyOn(GitHub, "authenticateAsInstallation").mockResolvedValue({
      requestReadme,
    } as unknown as Awaited<
      ReturnType<typeof GitHub.authenticateAsInstallation>
    >);
    return requestReadme;
  }

  it("should return the README of a repository", async () => {
    const user = await buildConnectedUser();
    stubReadme();

    const res = await server.post("/api/github.content", user, {
      body: { url: README_URL },
    });

    expect(res.status).toEqual(200);
    expect((await res.json()).data).toEqual({
      path: "README.md",
      language: "markdown",
      content: "# App",
      url: "https://github.com/acme/app/blob/main/README.md",
    });
  });

  it("should serve repeated requests from the cache", async () => {
    const user = await buildConnectedUser();
    const requestReadme = stubReadme();
    const url = `${README_URL}#cache-${user.teamId}`;

    await server.post("/api/github.content", user, { body: { url } });
    await server.post("/api/github.content", user, { body: { url } });

    expect(requestReadme).toHaveBeenCalledTimes(1);
  });

  it("should reject a link that is not a repository file", async () => {
    const user = await buildConnectedUser();

    const res = await server.post("/api/github.content", user, {
      body: { url: "https://github.com/acme/app/issues/1" },
    });

    expect(res.status).toEqual(400);
  });

  it("should reject guests", async () => {
    const user = await buildConnectedUser(buildGuestUser);

    const res = await server.post("/api/github.content", user, {
      body: { url: README_URL },
    });

    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/github.content", {
      body: { url: README_URL },
    });

    expect(res.status).toEqual(401);
  });
});

const ENV_KEYS = [
  "GITHUB_APP_ID",
  "GITHUB_APP_NAME",
  "GITHUB_APP_PRIVATE_KEY",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GITHUB_WEBHOOK_SECRET",
] as const;

const PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----test";

function withoutEnvApp() {
  const saved = ENV_KEYS.map((key) => [key, env[key]] as const);

  beforeEach(async () => {
    ENV_KEYS.forEach((key) => {
      env[key] = undefined;
    });
    await GitHubApp.destroy({ where: {} });
  });

  afterEach(async () => {
    saved.forEach(([key, value]) => {
      env[key] = value;
    });
    await GitHubApp.destroy({ where: {} });
    vi.restoreAllMocks();
  });
}

const storeApp = () =>
  GitHubApp.create({
    appId: 7,
    slug: "canon-stored",
    clientId: "Iv1.stored",
    clientSecret: "client-secret",
    webhookSecret: "webhook-secret",
    privateKey: PRIVATE_KEY,
  });

describe("#github.app", () => {
  withoutEnvApp();

  it("should return null without an app", async () => {
    const user = await buildUser();
    const res = await server.post("/api/github.app", user);
    expect(res.status).toEqual(200);
    expect((await res.json()).data).toBeNull();
  });

  it("should return the stored app", async () => {
    await storeApp();
    const user = await buildUser();
    const res = await server.post("/api/github.app", user);
    expect((await res.json()).data).toEqual({
      slug: "canon-stored",
      clientId: "Iv1.stored",
    });
  });

  it("should prefer the app from the environment", async () => {
    await storeApp();
    env.GITHUB_APP_ID = "1";
    env.GITHUB_APP_NAME = "canon-env";
    env.GITHUB_APP_PRIVATE_KEY = Buffer.from(PRIVATE_KEY).toString("base64");
    env.GITHUB_CLIENT_ID = "Iv1.env";
    env.GITHUB_CLIENT_SECRET = "env-secret";
    const user = await buildUser();
    const res = await server.post("/api/github.app", user);
    expect((await res.json()).data).toEqual({
      slug: "canon-env",
      clientId: "Iv1.env",
    });
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/github.app");
    expect(res.status).toEqual(401);
  });
});

describe("#github.manifest", () => {
  withoutEnvApp();

  const conversion = vi.fn();

  beforeEach(() => {
    setSelfHosted();
    conversion.mockReset();
    githubApi.use(
      http.post(
        "https://api.github.com/app-manifests/:code/conversions",
        ({ params }) => {
          conversion(params.code);
          return HttpResponse.json(
            {
              id: 42,
              slug: "canon-acme",
              client_id: "Iv1.abc",
              client_secret: "client-secret",
              webhook_secret: "webhook-secret",
              pem: PRIVATE_KEY,
            },
            { status: 201 }
          );
        }
      )
    );
  });

  const callManifest = (
    user: Awaited<ReturnType<typeof buildUser>>,
    cookieNonce = "nonce"
  ) =>
    server.get(
      `/api/github.manifest?code=manifest-code&state=${encodeURIComponent(
        JSON.stringify({ teamId: user.teamId, nonce: "nonce" })
      )}`,
      user,
      {
        redirect: "manual",
        headers: { Cookie: `githubOAuthNonce=${cookieNonce}` },
      }
    );

  it("should store the app encrypted and continue to its installation", async () => {
    const user = await buildAdmin();

    const res = await callManifest(user);

    expect(res.status).toEqual(302);
    expect(conversion).toHaveBeenCalledWith("manifest-code");
    const location = new URL(res.headers.get("location")!);
    expect(location.origin + location.pathname).toEqual(
      "https://github.com/apps/canon-acme/installations/new"
    );
    const state = JSON.parse(location.searchParams.get("state")!);
    expect(state.teamId).toEqual(user.teamId);
    expect(res.headers.get("set-cookie")).toContain(
      `githubOAuthNonce=${state.nonce}`
    );

    const app = await GitHubApp.findOne({ rejectOnEmpty: true });
    expect(app).toMatchObject({
      appId: 42,
      slug: "canon-acme",
      clientId: "Iv1.abc",
      clientSecret: "client-secret",
      webhookSecret: "webhook-secret",
      privateKey: PRIVATE_KEY,
    });
    const [rows] = await sequelize.query(
      "SELECT encode(\"privateKey\", 'escape') AS raw FROM github_apps"
    );
    expect(JSON.stringify(rows)).not.toContain("PRIVATE KEY");
  });

  it("should reject a mismatched state nonce", async () => {
    const user = await buildAdmin();

    const res = await callManifest(user, "other");

    expect(res.status).toEqual(400);
    expect(conversion).not.toHaveBeenCalled();
    expect(await GitHubApp.count()).toEqual(0);
  });

  it("should reject a user who cannot create integrations", async () => {
    const user = await buildUser();

    const res = await callManifest(user);

    expect(res.status).toEqual(403);
    expect(conversion).not.toHaveBeenCalled();
    expect(await GitHubApp.count()).toEqual(0);
  });

  it("should refuse to create an instance-wide app on a cloud-hosted instance", async () => {
    setCloudHosted();
    const user = await buildAdmin();

    const res = await callManifest(user);

    expect(res.status).toEqual(403);
    expect(conversion).not.toHaveBeenCalled();
    expect(await GitHubApp.count()).toEqual(0);
  });

  it("should not replace a configured app", async () => {
    await storeApp();
    const user = await buildAdmin();

    const res = await callManifest(user);

    expect(res.status).toEqual(400);
    expect(conversion).not.toHaveBeenCalled();
    expect(await GitHubApp.count()).toEqual(1);
  });
});

describe("#github.webhooks", () => {
  withoutEnvApp();

  const payload = { action: "created", installation: { id: 1 } };
  const sign = (secret: string) =>
    `sha256=${crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(payload))
      .digest("hex")}`;
  const deliver = (signature: string) =>
    server.post("/api/github.webhooks", {
      body: payload,
      headers: { "x-hub-signature-256": signature },
    });

  it("should accept a delivery signed with the stored secret", async () => {
    await storeApp();
    const schedule = vi
      .spyOn(GitHubWebhookTask.prototype, "schedule")
      .mockResolvedValue(
        {} as Awaited<ReturnType<GitHubWebhookTask["schedule"]>>
      );

    const res = await deliver(sign("webhook-secret"));

    expect(res.status).toEqual(202);
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it("should reject a delivery without an app", async () => {
    const res = await deliver(sign("webhook-secret"));
    expect(res.status).toEqual(401);
  });
});
