import embeds from "../embeds";
import { getMatchingEmbed, getSpecificEmbed } from "./embeds";

describe("getMatchingEmbed", () => {
  it("should match GitHub files and repositories to the GitHub file embed", () => {
    for (const url of [
      "https://github.com/acme/app",
      "https://github.com/acme/app/",
      "https://github.com/acme/app/blob/main/README.md",
      "https://github.com/acme/app/blob/main/src/index.ts#L1-L9",
    ]) {
      expect(getMatchingEmbed(embeds, url)?.embed.id).toBe("github-file");
    }
  });

  it("should not match other GitHub pages to the GitHub file embed", () => {
    for (const url of [
      "https://github.com/acme/app/issues/1",
      "https://github.com/acme/app/pull/2",
      "https://github.com/acme/app/commit/abc123",
      "https://github.com/acme/app/tree/main",
      "https://github.com/orgs/acme/projects/1",
    ]) {
      expect(getMatchingEmbed(embeds, url)?.embed.id).not.toBe("github-file");
    }
  });
});

describe("getSpecificEmbed", () => {
  it("should return the embed made for the link", () => {
    expect(getSpecificEmbed(embeds, "https://github.com/acme/app")?.id).toBe(
      "github-file"
    );
  });

  it("should not fall back to the generic iframe embed", () => {
    expect(
      getSpecificEmbed(embeds, "https://github.com/acme/app/issues/1")
    ).toBeUndefined();
  });
});
