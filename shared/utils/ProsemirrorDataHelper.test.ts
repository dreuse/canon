import type { ProsemirrorData } from "../types";
import { ProsemirrorDataHelper } from "./ProsemirrorDataHelper";

describe("ProsemirrorDataHelper", () => {
  describe("getEmpty", () => {
    it("returns a new empty document each call", () => {
      const a = ProsemirrorDataHelper.getEmpty();
      const b = ProsemirrorDataHelper.getEmpty();
      expect(a).toEqual({
        type: "doc",
        content: [{ content: [], type: "paragraph" }],
      });
      expect(a).not.toBe(b);
    });

    it("produces data considered empty", () => {
      expect(
        ProsemirrorDataHelper.isEmpty(ProsemirrorDataHelper.getEmpty())
      ).toBe(true);
    });
  });

  describe("toPlainText", () => {
    it("returns an empty string for an empty document", () => {
      expect(
        ProsemirrorDataHelper.toPlainText(ProsemirrorDataHelper.getEmpty())
      ).toBe("");
    });

    it("joins text across nested nodes", () => {
      const data: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Como o isolamento" },
              { type: "text", text: " por schema funciona" },
            ],
          },
          {
            type: "bullet_list",
            content: [
              {
                type: "list_item",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "um" }],
                  },
                ],
              },
            ],
          },
        ],
      };
      expect(ProsemirrorDataHelper.toPlainText(data)).toBe(
        "Como o isolamento por schema funciona um"
      );
    });

    it("keeps marked text and ignores nodes without text", () => {
      const data: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "veja", marks: [{ type: "strong" }] },
              { type: "image", attrs: { src: "a.png" } },
              { type: "text", text: "aqui" },
            ],
          },
        ],
      };
      expect(ProsemirrorDataHelper.toPlainText(data)).toBe("veja aqui");
    });

    it("collapses whitespace introduced by block boundaries", () => {
      const data: ProsemirrorData = {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "  um  " }] },
          { type: "paragraph", content: [] },
          { type: "paragraph", content: [{ type: "text", text: "dois" }] },
        ],
      };
      expect(ProsemirrorDataHelper.toPlainText(data)).toBe("um dois");
    });
  });

  describe("isEmpty", () => {
    it("returns false when the root is not a doc", () => {
      const data: ProsemirrorData = { type: "paragraph" };
      expect(ProsemirrorDataHelper.isEmpty(data)).toBe(false);
    });

    it("returns true for a doc with no content", () => {
      expect(ProsemirrorDataHelper.isEmpty({ type: "doc" })).toBe(true);
      expect(ProsemirrorDataHelper.isEmpty({ type: "doc", content: [] })).toBe(
        true
      );
    });

    it("returns true for a doc with a single empty paragraph", () => {
      const data: ProsemirrorData = {
        type: "doc",
        content: [{ type: "paragraph", content: [] }],
      };
      expect(ProsemirrorDataHelper.isEmpty(data)).toBe(true);
    });

    it("returns false when the single paragraph has content", () => {
      const data: ProsemirrorData = {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "hi" }] },
        ],
      };
      expect(ProsemirrorDataHelper.isEmpty(data)).toBe(false);
    });

    it("returns false when there are multiple nodes", () => {
      const data: ProsemirrorData = {
        type: "doc",
        content: [
          { type: "paragraph", content: [] },
          { type: "paragraph", content: [] },
        ],
      };
      expect(ProsemirrorDataHelper.isEmpty(data)).toBe(false);
    });
  });
});
