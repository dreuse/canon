import { refractor } from "refractor/core";
import Storage from "../../utils/Storage";
import {
  codeLanguages,
  getRefractorLangForLanguage,
  getLabelForLanguage,
  setRecentlyUsedCodeLanguage,
  getRecentlyUsedCodeLanguage,
  getFrequentCodeLanguages,
  getLanguageForFilename,
} from "./code";

describe("getRefractorLangForLanguage", () => {
  it("should return the correct lang identifier for a given language", () => {
    expect(getRefractorLangForLanguage("javascript")).toBe("javascript");
    expect(getRefractorLangForLanguage("mermaid")).toBe("mermaid");
    expect(getRefractorLangForLanguage("mermaidjs")).toBe("mermaid");
    expect(getRefractorLangForLanguage("xml")).toBe("markup");
    expect(getRefractorLangForLanguage("diff")).toBe("diff");
    expect(getRefractorLangForLanguage("fortran")).toBe("fortran");
    expect(getRefractorLangForLanguage("unknown")).toBeUndefined();
    expect(getRefractorLangForLanguage("")).toBeUndefined();
  });
});

describe("codeLanguages", () => {
  it("should load and register a syntax for every language", async () => {
    for (const { lang, loader } of Object.values(codeLanguages)) {
      if (!loader) {
        continue;
      }
      refractor.register(await loader());
      expect(refractor.registered(lang)).toBe(true);
      expect(refractor.highlight("x", lang).type).toBe("root");
    }
  });
});

describe("getLabelForLanguage", () => {
  it("should return the correct human-readable label for a given language", () => {
    expect(getLabelForLanguage("javascript")).toBe("JavaScript");
    expect(getLabelForLanguage("mermaid")).toBe("Mermaid");
    expect(getLabelForLanguage("mermaidjs")).toBe("Mermaid");
    expect(getLabelForLanguage("xml")).toBe("XML");
    expect(getLabelForLanguage("diff")).toBe("Diff");
    expect(getLabelForLanguage("fortran")).toBe("Fortran");
    expect(getLabelForLanguage("unknown")).toBe("Plain text");
    expect(getLabelForLanguage("none")).toBe("Plain text");
    expect(getLabelForLanguage("")).toBe("Plain text");
  });
});

describe("setRecentlyUsedCodeLanguage", () => {
  beforeEach(() => {
    Storage.clear();
  });

  it("should remember the last selected code language", () => {
    setRecentlyUsedCodeLanguage("javascript");
    expect(getRecentlyUsedCodeLanguage()).toBe("javascript");
  });

  it("should not remember mermaid as the last selected code language", () => {
    setRecentlyUsedCodeLanguage("javascript");
    setRecentlyUsedCodeLanguage("mermaid");
    expect(getRecentlyUsedCodeLanguage()).toBe("javascript");
  });

  it("should not remember mermaidjs as the last selected code language", () => {
    setRecentlyUsedCodeLanguage("javascript");
    setRecentlyUsedCodeLanguage("mermaidjs");
    expect(getRecentlyUsedCodeLanguage()).toBe("javascript");
  });

  it("should ignore mermaid that was already persisted", () => {
    Storage.set("rme-code-language", "mermaid");
    expect(getRecentlyUsedCodeLanguage()).toBeUndefined();
  });
});

describe("getFrequentCodeLanguages", () => {
  beforeEach(() => {
    Storage.clear();
  });

  it("should exclude mermaid that was already persisted", () => {
    Storage.set("frequent-code-languages", {
      javascript: 3,
      mermaid: 5,
      mermaidjs: 2,
    });
    expect(getFrequentCodeLanguages()).toEqual(["javascript"]);
  });
});

describe("getLanguageForFilename", () => {
  it("should map a file extension to a code language", () => {
    expect(getLanguageForFilename("src/index.ts")).toBe("typescript");
    expect(getLanguageForFilename("app/Main.KT")).toBe("kotlin");
    expect(getLanguageForFilename("config.yml")).toBe("yaml");
  });

  it("should map a known filename without an extension", () => {
    expect(getLanguageForFilename("docker/Dockerfile")).toBe("docker");
    expect(getLanguageForFilename("Makefile")).toBe("makefile");
  });

  it("should fall back to plain text", () => {
    expect(getLanguageForFilename("notes.unknown")).toBe("none");
    expect(getLanguageForFilename("LICENSE")).toBe("none");
    expect(getLanguageForFilename("a.constructor")).toBe("none");
  });
});
