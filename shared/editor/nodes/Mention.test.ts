import { MentionType } from "../../types";
import { extensionManager, schema } from "../../test/editor";

const serializer = extensionManager.serializer();
const parser = extensionManager.parser({
  schema,
  plugins: extensionManager.rulePlugins,
});

function docWithMention(attrs: Record<string, unknown>) {
  return schema.node("doc", null, [
    schema.node("paragraph", null, [schema.nodes.mention.create(attrs)]),
  ]);
}

function hrefsAfterRoundTrip(attrs: Record<string, unknown>) {
  const doc = parser.parse(serializer.serialize(docWithMention(attrs)));
  const hrefs: string[] = [];

  doc?.descendants((node) => {
    const link = node.marks.find((mark) => mark.type.name === "link");
    if (link) {
      hrefs.push(link.attrs.href);
    }
    return undefined;
  });

  return hrefs;
}

describe("Mention markdown serialization", () => {
  it("serializes a url mention as a regular link so the target survives", () => {
    const markdown = serializer.serialize(
      docWithMention({
        type: MentionType.URL,
        label: "EasyRetro board",
        href: "https://easyretro.io/publicboard/Qus08",
        modelId: "6f1d0a4e-8d5a-4a7f-9c8b-1f2a3b4c5d6e",
        id: "0c9f7f2a-1b3c-4d5e-8f90-a1b2c3d4e5f6",
      })
    );

    expect(markdown.trim()).toBe(
      "[EasyRetro board](https://easyretro.io/publicboard/Qus08)"
    );
  });

  it("falls back to the mention form when a url mention has no href", () => {
    const markdown = serializer.serialize(
      docWithMention({
        type: MentionType.URL,
        label: "EasyRetro board",
        modelId: "6f1d0a4e-8d5a-4a7f-9c8b-1f2a3b4c5d6e",
        id: "0c9f7f2a-1b3c-4d5e-8f90-a1b2c3d4e5f6",
      })
    );

    expect(markdown.trim()).toBe(
      "@[EasyRetro board](mention://0c9f7f2a-1b3c-4d5e-8f90-a1b2c3d4e5f6/url/6f1d0a4e-8d5a-4a7f-9c8b-1f2a3b4c5d6e)"
    );
  });

  it("stops a label from closing the link and injecting a second one", () => {
    expect(
      hrefsAfterRoundTrip({
        type: MentionType.URL,
        label: "safe](javascript:alert(1)) [",
        href: "https://easyretro.io/x",
        modelId: "6f1d0a4e-8d5a-4a7f-9c8b-1f2a3b4c5d6e",
        id: "0c9f7f2a-1b3c-4d5e-8f90-a1b2c3d4e5f6",
      })
    ).toEqual(["https://easyretro.io/x"]);
  });

  it("neutralizes a javascript scheme in the href", () => {
    const markdown = serializer.serialize(
      docWithMention({
        type: MentionType.URL,
        label: "Click me",
        href: "javascript:alert(1)",
        modelId: "6f1d0a4e-8d5a-4a7f-9c8b-1f2a3b4c5d6e",
        id: "0c9f7f2a-1b3c-4d5e-8f90-a1b2c3d4e5f6",
      })
    );

    expect(markdown).not.toContain("(javascript:");
  });

  it("stops a href from closing the link and injecting a second one", () => {
    const hrefs = hrefsAfterRoundTrip({
      type: MentionType.URL,
      label: "Board",
      href: "https://easyretro.io/x) [gotcha](https://evil.example.com",
      modelId: "6f1d0a4e-8d5a-4a7f-9c8b-1f2a3b4c5d6e",
      id: "0c9f7f2a-1b3c-4d5e-8f90-a1b2c3d4e5f6",
    });

    expect(hrefs).toHaveLength(1);
    expect(hrefs[0]).not.toContain("evil.example.com/");
    expect(hrefs[0]).toMatch(/^https:\/\/easyretro\.io\/x%29/);
  });

  it.each([MentionType.Issue, MentionType.PullRequest, MentionType.Project])(
    "serializes a %s mention as a regular link so the target survives",
    (type) => {
      const markdown = serializer.serialize(
        docWithMention({
          type,
          label: "Fix the sidebar",
          href: "https://github.com/dreuse/canon/issues/42",
          modelId: "6f1d0a4e-8d5a-4a7f-9c8b-1f2a3b4c5d6e",
          id: "0c9f7f2a-1b3c-4d5e-8f90-a1b2c3d4e5f6",
        })
      );

      expect(markdown.trim()).toBe(
        "[Fix the sidebar](https://github.com/dreuse/canon/issues/42)"
      );
    }
  );

  it.each([MentionType.Issue, MentionType.PullRequest, MentionType.Project])(
    "falls back to the mention form when a %s mention has no href",
    (type) => {
      const markdown = serializer.serialize(
        docWithMention({
          type,
          label: "Fix the sidebar",
          modelId: "6f1d0a4e-8d5a-4a7f-9c8b-1f2a3b4c5d6e",
          id: "0c9f7f2a-1b3c-4d5e-8f90-a1b2c3d4e5f6",
        })
      );

      expect(markdown.trim()).toBe(
        `@[Fix the sidebar](mention://0c9f7f2a-1b3c-4d5e-8f90-a1b2c3d4e5f6/${type}/6f1d0a4e-8d5a-4a7f-9c8b-1f2a3b4c5d6e)`
      );
    }
  );

  it("stops an issue label from closing the link and injecting a second one", () => {
    expect(
      hrefsAfterRoundTrip({
        type: MentionType.Issue,
        label: "safe](javascript:alert(1)) [",
        href: "https://github.com/dreuse/canon/issues/42",
        modelId: "6f1d0a4e-8d5a-4a7f-9c8b-1f2a3b4c5d6e",
        id: "0c9f7f2a-1b3c-4d5e-8f90-a1b2c3d4e5f6",
      })
    ).toEqual(["https://github.com/dreuse/canon/issues/42"]);
  });

  it("keeps the mention form for a user mention", () => {
    const markdown = serializer.serialize(
      docWithMention({
        type: MentionType.User,
        label: "Alan",
        modelId: "6f1d0a4e-8d5a-4a7f-9c8b-1f2a3b4c5d6e",
        id: "0c9f7f2a-1b3c-4d5e-8f90-a1b2c3d4e5f6",
      })
    );

    expect(markdown.trim()).toBe(
      "@[Alan](mention://0c9f7f2a-1b3c-4d5e-8f90-a1b2c3d4e5f6/user/6f1d0a4e-8d5a-4a7f-9c8b-1f2a3b4c5d6e)"
    );
  });
});
