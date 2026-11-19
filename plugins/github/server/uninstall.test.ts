import { RequestError } from "octokit";
import { IntegrationService, IntegrationType } from "@shared/types";
import type { Integration } from "@server/models";
import { GitHub } from "./github";
import { uninstall } from "./uninstall";

type InstallationClient = Awaited<
  ReturnType<typeof GitHub.authenticateAsInstallation>
>;

const INSTALLATION_ID = 42;

const integration = {
  service: IntegrationService.GitHub,
  type: IntegrationType.Embed,
  settings: {
    github: {
      installation: {
        id: INSTALLATION_ID,
        account: { id: 1, name: "acme", avatarUrl: "" },
      },
    },
  },
} as Integration<IntegrationType.Embed>;

function stubUninstall(status: number) {
  vi.spyOn(GitHub, "authenticateAsInstallation").mockResolvedValue({
    requestAppUninstall: async () => {
      throw new RequestError("error", status, {
        request: {
          method: "DELETE",
          url: "https://api.github.com",
          headers: {},
        },
      });
    },
  } as unknown as InstallationClient);
}

describe("uninstall", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should resolve when the app is already uninstalled", async () => {
    stubUninstall(404);

    await expect(uninstall(integration)).resolves.toBeUndefined();
  });

  it("should throw on other GitHub errors", async () => {
    stubUninstall(500);

    await expect(uninstall(integration)).rejects.toThrow(RequestError);
  });
});
