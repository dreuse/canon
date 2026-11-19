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
