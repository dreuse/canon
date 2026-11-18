import fs from "node:fs";
import path from "node:path";

const translations: Record<string, string> = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, "locales", "pt_BR", "translation.json"),
    "utf8"
  )
);

describe("pt-BR editor strings", () => {
  it("R14 labels the comments tab Abertas", () => {
    expect(translations["Open comments"]).toBe("Abertas");
  });

  it("R14 labels the comment sort Ordem manual", () => {
    expect(translations["Order in doc"]).toBe("Ordem manual");
  });
});
