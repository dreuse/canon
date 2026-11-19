import { randomInt } from "node:crypto";
import { IntegrationService, IntegrationType } from "@shared/types";
import { Integration } from "@server/models";
import { buildIntegration } from "@server/test/factories";
import { CacheHelper } from "@server/utils/CacheHelper";
import { RedisPrefixHelper } from "@server/utils/RedisPrefixHelper";
import { GitHubIssueProvider } from "./GitHubIssueProvider";

const MAX_INSTALLATION_ID = 2 ** 31;
const provider = new GitHubIssueProvider();

function buildGitHubIntegration(installationId: number) {
  return buildIntegration({
    service: IntegrationService.GitHub,
    type: IntegrationType.Embed,
    settings: {
      github: {
        installation: {
          id: installationId,
          account: { id: 1, name: "acme", avatarUrl: "" },
        },
      },
    },
  });
}

function sendInstallationEvent(action: string, installationId: number) {
  return provider.handleWebhook({
    payload: { action, installation: { id: installationId } },
    headers: { "x-github-event": "installation", "x-github-hook-id": "1" },
  });
}

describe("GitHubIssueProvider installation events", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should remove the integration when the installation is deleted", async () => {
    const clearData = vi.spyOn(CacheHelper, "clearData");
    const installationId = randomInt(MAX_INSTALLATION_ID);
    const integration = await buildGitHubIntegration(installationId);

    await sendInstallationEvent("deleted", installationId);

    expect(await Integration.findByPk(integration.id)).toBeNull();
    expect(clearData).toHaveBeenCalledWith(
      RedisPrefixHelper.getUnfurlPrefix(integration.teamId)
    );
  });

  it("should keep integrations of other installations", async () => {
    const installationId = randomInt(MAX_INSTALLATION_ID);
    const other = await buildGitHubIntegration(installationId + 1);

    await sendInstallationEvent("deleted", installationId);

    expect(await Integration.findByPk(other.id)).not.toBeNull();
  });

  it("should keep the integration when the installation is suspended", async () => {
    const installationId = randomInt(MAX_INSTALLATION_ID);
    const integration = await buildGitHubIntegration(installationId);

    await sendInstallationEvent("suspend", installationId);

    expect(await Integration.findByPk(integration.id)).not.toBeNull();
  });
});
