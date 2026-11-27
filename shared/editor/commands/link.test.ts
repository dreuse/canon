import { EditorState, TextSelection } from "prosemirror-state";
import { schema } from "@shared/test/editor";
import { replaceLink } from "./link";

const HREF = "https://github.com/facebook/react";

function stateWithLink(cursor: number) {
  const doc = schema.nodes.doc.create(null, [
    schema.nodes.paragraph.create(null, [
      schema.text("see "),
      schema.text("react", [schema.marks.link.create({ href: HREF })]),
      schema.text(" now"),
    ]),
  ]);
  const state = EditorState.create({ schema, doc });
  return state.apply(
    state.tr.setSelection(TextSelection.create(state.doc, cursor))
  );
}

describe("replaceLink", () => {
  it("replaces the whole link around the cursor with the node", () => {
    let state = stateWithLink(7);
    const embed = schema.nodes.embed.create({ href: HREF });

    const handled = replaceLink(embed)(state, (tr) => {
      state = state.apply(tr);
    });

    expect(handled).toBe(true);
    expect(state.doc.textContent).not.toContain("react");
    let embedCount = 0;
    state.doc.descendants((node) => {
      if (node.type === schema.nodes.embed) {
        embedCount += 1;
      }
    });
    expect(embedCount).toBe(1);
  });

  it("does nothing when the cursor is not on a link", () => {
    const state = stateWithLink(2);
    const embed = schema.nodes.embed.create({ href: HREF });

    expect(replaceLink(embed)(state)).toBe(false);
  });
});
