import { IntegrationService } from "@shared/types";
import type Integration from "~/models/Integration";
import { getCodeSnippetProvider } from "./codeSnippet";
import { Hook, PluginManager } from "./PluginManager";

const buildIntegration = (service: IntegrationService) =>
  ({ service, settings: {} }) as unknown as Integration;

describe("getCodeSnippetProvider", () => {
  const url = new URL("https://example.com/file#L1");

  beforeAll(() => {
    PluginManager.add({
      id: "test-code-snippet-provider",
      name: "Test code snippet provider",
      type: Hook.CodeSnippetProvider,
      value: {
        service: IntegrationService.GitHub,
        matches: (candidate) => candidate.hostname === "example.com",
        fetch: async () => ({ language: "none", code: "" }),
      },
    });
  });

  it("returns the provider when the team has its integration", () => {
    expect(
      getCodeSnippetProvider(url, [buildIntegration(IntegrationService.GitHub)])
        ?.service
    ).toBe(IntegrationService.GitHub);
  });

  it("ignores providers without a connected integration", () => {
    expect(
      getCodeSnippetProvider(url, [buildIntegration(IntegrationService.Slack)])
    ).toBeUndefined();
  });

  it("ignores URLs the provider does not match", () => {
    expect(
      getCodeSnippetProvider(new URL("https://other.com/"), [
        buildIntegration(IntegrationService.GitHub),
      ])
    ).toBeUndefined();
  });
});
