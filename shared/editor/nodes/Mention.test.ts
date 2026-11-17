import { MentionType } from "../../types";
import { parser, schema, serializer } from "../../test/editor";

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

const id = "0c440212-8b40-49fa-8a64-2548d6b60d59";
const modelId = "c85a0d80-3a89-4b25-a0cd-e7fc83f0d226";

const serializeMention = (
  attrs: Record<string, unknown>,
  options?: { commonMark?: boolean }
) => {
  const doc = schema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "mention", attrs: { id, modelId, ...attrs } }],
      },
    ],
  });
  return serializer.serialize(doc, options).trim();
};

describe("Mention serialization", () => {
  describe("markdown leaving Outline", () => {
    it("serializes an issue mention as an @ prefixed link to the external url", () => {
      expect(
        serializeMention(
          {
            type: MentionType.Issue,
            label: "Epic 1: Control plane Helm chart",
            href: "https://github.com/acme/infra/issues/2",
          },
          { commonMark: true }
        )
      ).toBe(
        "@[Epic 1: Control plane Helm chart](https://github.com/acme/infra/issues/2)"
      );
    });

    it("serializes a pull request mention as an @ prefixed link to the external url", () => {
      expect(
        serializeMention(
          {
            type: MentionType.PullRequest,
            label: "Add Helm chart",
            href: "https://github.com/acme/infra/pull/42",
          },
          { commonMark: true }
        )
      ).toBe("@[Add Helm chart](https://github.com/acme/infra/pull/42)");
    });

    it("serializes a project mention as an @ prefixed link to the external url", () => {
      expect(
        serializeMention(
          {
            type: MentionType.Project,
            label: "Q3 Roadmap",
            href: "https://github.com/orgs/acme/projects/7",
          },
          { commonMark: true }
        )
      ).toBe("@[Q3 Roadmap](https://github.com/orgs/acme/projects/7)");
    });

    it("serializes a url mention as an @ prefixed link", () => {
      expect(
        serializeMention(
          {
            type: MentionType.URL,
            label: "Example",
            href: "https://example.com/page",
          },
          { commonMark: true }
        )
      ).toBe("@[Example](https://example.com/page)");
    });

    it("sanitizes an unsafe url", () => {
      const markdown = serializeMention(
        {
          type: MentionType.Issue,
          label: "Epic 1",
          href: "javascript:alert(1)",
        },
        { commonMark: true }
      );
      expect(markdown).not.toContain("(javascript:");
    });

    it("keeps the mention:// format when there is no url to link to", () => {
      expect(
        serializeMention(
          { type: MentionType.Issue, label: "Epic 1" },
          { commonMark: true }
        )
      ).toBe(`@[Epic 1](mention://${id}/issue/${modelId})`);
    });

    it("keeps the mention:// format for internal mentions", () => {
      expect(
        serializeMention(
          { type: MentionType.User, label: "John Doe" },
          { commonMark: true }
        )
      ).toBe(`@[John Doe](mention://${id}/user/${modelId})`);
    });
  });

  describe("document and collection mentions", () => {
    it("serializes a document mention as an internal link", () => {
      expect(
        serializeMention(
          { type: MentionType.Document, label: "Onboarding" },
          { commonMark: true }
        )
      ).toBe(`[Onboarding](/doc/${modelId})`);
    });

    it("serializes a collection mention as an internal link", () => {
      expect(
        serializeMention(
          { type: MentionType.Collection, label: "Engineering" },
          { commonMark: true }
        )
      ).toBe(`[Engineering](/collection/${modelId})`);
    });
  });
});
