import { RequestError } from "octokit";
import { IntegrationService, IntegrationType } from "@shared/types";
import { Integration } from "@server/models";
import {
  buildAdmin,
  buildGuestUser,
  buildIntegration,
  buildTeam,
  buildUser,
  buildViewer,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { GitHub, InstallationAccess, MAX_SNIPPET_LINES } from "../github";
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
