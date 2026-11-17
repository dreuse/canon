import type { ProsemirrorData } from "../types";

/**
 * Helpers that operate on plain `ProsemirrorData` JSON.
 */
export class ProsemirrorDataHelper {
  /**
   * Get a new empty document.
   *
   * @returns a new empty document as JSON.
   */
  static getEmpty(): ProsemirrorData {
    return {
      type: "doc",
      content: [
        {
          content: [],
          type: "paragraph",
        },
      ],
    };
  }

  static toPlainText(data: ProsemirrorData): string {
    const parts: string[] = [];

    const walk = (node: ProsemirrorData) => {
      if (node.text) {
        parts.push(node.text);
      }
      node.content?.forEach(walk);
    };

    walk(data);

    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  static toLinkHrefs(data: ProsemirrorData): string[] {
    const hrefs: string[] = [];

    const walk = (node: ProsemirrorData) => {
      node.marks?.forEach((mark) => {
        const href = mark.attrs?.href;
        if (mark.type === "link" && typeof href === "string") {
          hrefs.push(href);
        }
      });
      node.content?.forEach(walk);
    };

    walk(data);

    return hrefs;
  }

  /**
   * Returns true if the data looks like an empty document.
   *
   * @param data The ProsemirrorData to check.
   * @returns True if the document is empty.
   */
  static isEmpty(data: ProsemirrorData): boolean {
    if (data.type !== "doc") {
      return false;
    }

    if (data.content?.length === 1) {
      const node = data.content[0];
      return (
        node.type === "paragraph" &&
        (node.content === null ||
          node.content === undefined ||
          node.content.length === 0)
      );
    }

    return !data.content || data.content.length === 0;
  }

  /**
   * Returns the first line of text in the document, useful for a short plain
   * text preview. Text blocks and hard breaks start a new line.
   *
   * @param data the ProsemirrorData to read.
   * @returns the trimmed first line with text, or undefined.
   */
  static getFirstText(data: ProsemirrorData): string | undefined {
    return ProsemirrorDataHelper.toLines(data)
      .map((line) => line.trim())
      .find(Boolean);
  }

  private static toLines(node: ProsemirrorData): string[] {
    if (node.type === "text") {
      return [node.text ?? ""];
    }

    // Text joins the current line. Any other node, such as a paragraph or a
    // hard break, is on its own lines.
    const lines = [""];
    for (const child of node.content ?? []) {
      if (child.type === "text") {
        lines[lines.length - 1] += child.text ?? "";
      } else {
        lines.push(...ProsemirrorDataHelper.toLines(child), "");
      }
    }
    return lines;
  }
}
