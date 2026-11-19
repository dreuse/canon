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

describe("GitHubUtils.manifest", () => {
  const baseUrl = "https://docs.example.com";
  const manifest = GitHubUtils.manifest("Canon", baseUrl);

  it("should name the app after the product and host", () => {
    expect(manifest.name).toBe("Canon docs.example.com");
  });

  it("should fit the name in GitHub's length limit", () => {
    const long = GitHubUtils.manifest(
      "Canon",
      "https://a-very-long-subdomain.example.com"
    );
    expect(long.name).toBe("Canon a-very-long-subdomain.exampl");
  });

  it("should point every URL at this instance", () => {
    expect(manifest).toMatchObject({
      url: baseUrl,
      hook_attributes: { url: `${baseUrl}/api/github.webhooks` },
      redirect_url: `${baseUrl}/api/github.manifest`,
      callback_urls: [`${baseUrl}/api/github.callback`],
      public: false,
      request_oauth_on_install: true,
    });
  });

  it("should request the permissions and events the integration uses", () => {
    expect(manifest.default_permissions).toEqual({
      contents: "read",
      issues: "write",
      members: "read",
      metadata: "read",
      organization_projects: "read",
      pull_requests: "write",
    });
    expect(manifest.default_events).toEqual(["repository"]);
  });
});

describe("GitHubUtils.manifestUrl", () => {
  const state = { teamId: "team", nonce: "nonce" };

  it("should create the app on the user's account without an organization", () => {
    const url = new URL(GitHubUtils.manifestUrl(state));
    expect(url.origin + url.pathname).toBe(
      "https://github.com/settings/apps/new"
    );
    expect(JSON.parse(url.searchParams.get("state")!)).toEqual(state);
  });

  it("should create the app on an organization", () => {
    const url = new URL(GitHubUtils.manifestUrl(state, "acme/../x"));
    expect(url.pathname).toBe("/organizations/acme%2F..%2Fx/settings/apps/new");
  });
});

describe("GitHubUtils.authUrl", () => {
  it("should install the given app", () => {
    const url = new URL(
      GitHubUtils.authUrl(
        { teamId: "team", nonce: "nonce" },
        { slug: "canon-acme", clientId: "Iv1.abc" }
      )
    );
    expect(url.pathname).toBe("/apps/canon-acme/installations/new");
    expect(url.searchParams.get("client_id")).toBe("Iv1.abc");
  });
});
