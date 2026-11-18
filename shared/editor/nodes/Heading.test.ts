/**
 * @vitest-environment jsdom
 */
import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import Heading from "./Heading";

const HEADING_CHIP_CLASS = "heading-chip";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "text*",
      toDOM: () => ["p", 0],
    },
    heading: {
      group: "block",
      content: "text*",
      attrs: { level: { default: 1 } },
      toDOM: (node) => [`h${node.attrs.level}`, 0],
    },
    text: {},
  },
});

describe("Heading", () => {
  it("R05 renders no heading chip", () => {
    const doc = schema.node("doc", null, [
      schema.node("heading", { level: 2 }, schema.text("First")),
      schema.node("heading", { level: 2 }, schema.text("Second")),
    ]);
    const view = new EditorView(document.createElement("div"), {
      state: EditorState.create({
        doc,
        plugins: new Heading().plugins,
      }),
    });

    expect(view.dom.querySelector(`.${HEADING_CHIP_CLASS}`)).toBeNull();
    view.dom.querySelectorAll("h2").forEach((heading) => {
      expect(heading.textContent).not.toMatch(/0[12]/);
    });
    view.destroy();
  });
});
