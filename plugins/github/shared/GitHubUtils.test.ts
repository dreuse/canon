import { MentionType } from "@shared/types";
import { GitHubUtils } from "./GitHubUtils";

describe("GitHubUtils.mentionType", () => {
  it("should map a commit to a URL mention", () => {
    expect(
      GitHubUtils.mentionType(
        new URL("https://github.com/acme/app/commit/0123456789abcdef")
      )
    ).toBe(MentionType.URL);
  });

  it("should map an issue to an issue mention", () => {
    expect(
      GitHubUtils.mentionType(new URL("https://github.com/acme/app/issues/1"))
    ).toBe(MentionType.Issue);
  });

  it("should ignore other repository pages", () => {
    expect(
      GitHubUtils.mentionType(new URL("https://github.com/acme/app/tree/main"))
    ).toBeUndefined();
  });
});

describe("GitHubUtils.parseCodePermalink", () => {
  it("should parse a line range", () => {
    expect(
      GitHubUtils.parseCodePermalink(
        new URL(
          "https://github.com/acme/app/blob/abc123/src/my%20file.ts#L10-L20"
        )
      )
    ).toEqual({
      owner: "acme",
      repo: "app",
      ref: "abc123",
      path: "src/my file.ts",
      startLine: 10,
      endLine: 20,
    });
  });

  it("should parse a single line and column ranges", () => {
    expect(
      GitHubUtils.parseCodePermalink(
        new URL("https://github.com/acme/app/blob/main/a.ts#L5")
      )
    ).toMatchObject({ startLine: 5, endLine: 5 });
    expect(
      GitHubUtils.parseCodePermalink(
        new URL("https://github.com/acme/app/blob/main/a.ts#L5C2-L7C9")
      )
    ).toMatchObject({ startLine: 5, endLine: 7 });
  });

  it("should reject links without a valid line range", () => {
    const invalid = [
      "https://github.com/acme/app/blob/main/a.ts",
      "https://github.com/acme/app/blob/main/a.ts#L9-L3",
      "https://github.com/acme/app/blob/main/a.ts#L0",
      "https://github.com/acme/app/blob/main#L1",
      "https://github.com/acme/app/tree/main/a.ts#L1",
      "https://github.com/acme/app/blob/main/%zz.ts#L1",
      "https://gitlab.com/acme/app/blob/main/a.ts#L1",
    ];

    for (const url of invalid) {
      expect(GitHubUtils.parseCodePermalink(new URL(url))).toBeUndefined();
    }
  });
});
