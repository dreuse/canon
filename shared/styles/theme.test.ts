import { readFileSync } from "fs";
import path from "path";
import { buildDarkTheme, buildLightTheme } from "./theme";

const INDEX_HTML = readFileSync(
  path.resolve(__dirname, "../../server/static/index.html"),
  "utf8"
);

const HEX_COLOR = /#[0-9a-f]{3,8}\b/gi;

const metaColors = (scheme: "light" | "dark") =>
  [
    ...INDEX_HTML.matchAll(
      new RegExp(
        `name="theme-color"\\s+content="([^"]+)"\\s+media="\\(prefers-color-scheme: ${scheme}\\)"`,
        "g"
      )
    ),
  ].map((match) => match[1]);

const scriptColors = () => {
  const script = INDEX_HTML.slice(
    INDEX_HTML.indexOf("<script"),
    INDEX_HTML.indexOf("</script>")
  );
  return script.match(HEX_COLOR) ?? [];
};

describe("dark theme", () => {
  const theme = buildDarkTheme({});

  it("R01 exposes the board surface values", () => {
    expect(theme.background).toBe("#23252C");
    expect(theme.sidebarBackground).toBe("#1D1F25");
    expect(theme.menuBackground).toBe("#35383F");
    expect(theme.modalBackground).toBe("#35383F");
  });

  it("R01 exposes the board line values", () => {
    expect(theme.divider).toBe("#2E3138");
    expect(theme.horizontalRule).toBe("#2E3138");
    expect(theme.inputBorder).toBe("#3A3D46");
  });

  it("R01 exposes the board text ladder", () => {
    expect(theme.text).toBe("#ECEDEF");
    expect(theme.textSecondary).toBe("#B4B8C1");
    expect(theme.textTertiary).toBe("#9097A3");
  });

  it("R01 exposes the board status colors", () => {
    expect(theme.success).toBe("#5FD69A");
    expect(theme.warning).toBe("#F2C14E");
    expect(theme.danger).toBe("#F48A8A");
  });

  it("R01 exposes the board code values", () => {
    expect(theme.codeBackground).toBe("#1A1C21");
    expect(theme.code).toBe("#D4D7DD");
    expect(theme.codeKeyword).toBe("#C3A6FF");
    expect(theme.codeString).toBe("#9AD7A8");
    expect(theme.codeComment).toBe("#8C93A0");
  });

  it("R15 draws scrollbars in the surface tone", () => {
    expect(theme.scrollbarBackground).toBe(theme.background);
    expect(theme.scrollbarThumb).toBe("#3A3D46");
  });
});

describe("light theme", () => {
  const theme = buildLightTheme({});

  it("R01 exposes the board surface values", () => {
    expect(theme.background).toBe("#FFFFFF");
    expect(theme.sidebarBackground).toBe("#F7F7F5");
    expect(theme.menuBackground).toBe("#FFFFFF");
  });

  it("R01 exposes the board line values", () => {
    expect(theme.divider).toBe("#ECECE8");
    expect(theme.horizontalRule).toBe("#ECECE8");
    expect(theme.inputBorder).toBe("#E0E0DB");
  });

  it("R01 exposes the board text ladder", () => {
    expect(theme.text).toBe("#16181D");
    expect(theme.textSecondary).toBe("#454B57");
    expect(theme.textTertiary).toBe("#5F6673");
  });

  it("R01 exposes the board status colors", () => {
    expect(theme.success).toBe("#187044");
    expect(theme.warning).toBe("#8F5B00");
    expect(theme.danger).toBe("#C0353D");
  });

  it("R01 exposes the board code values", () => {
    expect(theme.codeBackground).toBe("#F7F7F5");
    expect(theme.code).toBe("#24292F");
    expect(theme.codeKeyword).toBe("#7A3FC2");
    expect(theme.codeString).toBe("#1A7F37");
    expect(theme.codeComment).toBe("#5F6673");
  });

  it("R15 draws scrollbars in the surface tone", () => {
    expect(theme.scrollbarBackground).toBe(theme.background);
    expect(theme.scrollbarThumb).toBe("#E0E0DB");
  });
});

describe("theme-color in index.html", () => {
  it("R12 uses the dark background token in the dark meta tag", () => {
    expect(metaColors("dark").map((c) => c.toLowerCase())).toEqual([
      buildDarkTheme({}).background.toLowerCase(),
    ]);
  });

  it("R12 uses the light background token in the light meta tag", () => {
    expect(metaColors("light").map((c) => c.toLowerCase())).toEqual([
      buildLightTheme({}).background.toLowerCase(),
    ]);
  });

  it("R12 uses only the two background tokens in the inline script", () => {
    const allowed = [
      buildDarkTheme({}).background.toLowerCase(),
      buildLightTheme({}).background.toLowerCase(),
    ];
    const colors = scriptColors().map((c) => c.toLowerCase());

    expect(colors.sort()).toEqual([...allowed].sort());
  });
});
