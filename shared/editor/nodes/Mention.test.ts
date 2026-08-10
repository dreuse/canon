import { MentionType } from "../../types";
import { extensionManager, schema } from "../../test/editor";

const serializer = extensionManager.serializer();

function docWithMention(attrs: Record<string, unknown>) {
  return schema.node("doc", null, [
    schema.node("paragraph", null, [schema.nodes.mention.create(attrs)]),
  ]);
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
