import { schema } from "@shared/test/editor";
import { bareLinkDecorations } from "./Link";

function paragraph(text: string) {
  return schema.node("doc", null, [
    schema.node("paragraph", null, [schema.text(text)]),
  ]);
}

function ranges(text: string) {
  return bareLinkDecorations(paragraph(text)).map((decoration) => [
    decoration.from,
    decoration.to,
  ]);
}

function expectedRange(text: string, url: string) {
  const start = 1 + text.indexOf(url);
  return [start, start + url.length];
}

describe("bareLinkDecorations", () => {
  it("decorates a bare url in plain text", () => {
    const text = "See https://easyretro.io/publicboard/Qus08 now";
    expect(ranges(text)).toEqual([
      expectedRange(text, "https://easyretro.io/publicboard/Qus08"),
    ]);
  });

  it("excludes wrapping parentheses and trailing punctuation", () => {
    const text = "Alugar pela ARLOC (https://arklok.com.br/).";
    expect(ranges(text)).toEqual([
      expectedRange(text, "https://arklok.com.br/"),
    ]);
  });

  it("decorates every url on the line", () => {
    const text = "https://a.example.com and https://b.example.com";
    expect(ranges(text)).toEqual([
      expectedRange(text, "https://a.example.com"),
      expectedRange(text, "https://b.example.com"),
    ]);
  });

  it("ignores words that are not urls", () => {
    expect(ranges("Rodamos node.js, e.g. na versao 22.")).toEqual([]);
  });

  it("ignores urls without a protocol", () => {
    expect(ranges("Ver easyretro.io/publicboard hoje")).toEqual([]);
  });

  it("marks a link whose text is its own href", () => {
    const href = "https://easyretro.io/publicboard/Qus08";
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [
        schema.text(href, [schema.marks.link.create({ href })]),
      ]),
    ]);

    expect(
      bareLinkDecorations(doc).map((decoration) => [
        decoration.from,
        decoration.to,
      ])
    ).toEqual([[1, 1 + href.length]]);
  });

  it("leaves a link with its own label alone", () => {
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [
        schema.text("Board", [
          schema.marks.link.create({ href: "https://easyretro.io/x" }),
        ]),
      ]),
    ]);

    expect(bareLinkDecorations(doc)).toEqual([]);
  });

  it("ignores urls inside a code block", () => {
    const doc = schema.node("doc", null, [
      schema.node("code_fence", { language: "yaml" }, [
        schema.text("url: https://easyretro.io/x"),
      ]),
    ]);

    expect(bareLinkDecorations(doc)).toEqual([]);
  });

  it("ignores urls in inline code", () => {
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [
        schema.text("https://easyretro.io/x", [
          schema.marks.code_inline.create(),
        ]),
      ]),
    ]);

    expect(bareLinkDecorations(doc)).toEqual([]);
  });
});
