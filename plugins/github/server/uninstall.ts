import { RequestError } from "octokit";
import type { IntegrationType } from "@shared/types";
import { IntegrationService } from "@shared/types";
import type { Integration } from "@server/models";
import { GitHub } from "./github";

const NOT_FOUND = 404;

export async function uninstall(
  integration: Integration<IntegrationType.Embed>
) {
  if (integration.service === IntegrationService.GitHub) {
    const installationId = integration.settings?.github?.installation.id;

    if (installationId) {
      const client = await GitHub.authenticateAsInstallation(installationId);
      try {
        await client.requestAppUninstall(installationId);
      } catch (err) {
        if (!(err instanceof RequestError && err.status === NOT_FOUND)) {
          throw err;
        }
      }
    }
  }
}
