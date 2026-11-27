import { TextSelection } from "prosemirror-state";
import { buildSelectionContext } from "@shared/editor/lib/buildSelectionContext";
import { createEditorState, schema } from "@shared/test/editor";
import formattingMenuItems from "./formatting";

const LINK_TEXT = "the readme";

const embedLinkItem = (href: string) => {
  const link = schema.marks.link.create({ href });
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, [schema.text(LINK_TEXT, [link])]),
  ]);
  const state = createEditorState(doc);
  const selected = state.apply(
    state.tr.setSelection(
      TextSelection.create(state.doc, 1, 1 + LINK_TEXT.length)
    )
  );
  const ctx = buildSelectionContext(selected, {
    readOnly: false,
    isTemplate: false,
    rtl: false,
  });
  return formattingMenuItems(ctx).find((item) => item.name === "embedLink");
};

describe("formattingMenuItems", () => {
  it("offers to embed a selected GitHub link", () => {
    const href = "https://github.com/owner/repo/blob/main/README.md";
    const item = embedLinkItem(href);

    expect(item?.visible).toBe(true);
    expect(item?.attrs).toEqual({ href });
  });

  it("does not offer to embed other links", () => {
    expect(embedLinkItem("https://example.com/page")?.visible).toBeFalsy();
  });
});
