import { sidebarRailWidth, sidebarPanelWidth } from "@shared/styles/theme";
import { getCommentsLayout } from "./commentsLayout";

const DEFAULT_SIDEBAR_WIDTH = sidebarRailWidth + sidebarPanelWidth;

describe("getCommentsLayout", () => {
  it("R27 returns text 608 and margin 280 at 1280", () => {
    const layout = getCommentsLayout(1280, DEFAULT_SIDEBAR_WIDTH);

    expect(layout).toMatchObject({
      mode: "shifted",
      textWidth: 608,
      marginWidth: 280,
    });
  });

  it("R27 returns text 593 at 1025 with the collapsed sidebar", () => {
    const layout = getCommentsLayout(1025, sidebarRailWidth);

    expect(layout).toMatchObject({
      mode: "shifted",
      textWidth: 593,
      marginWidth: 280,
    });
  });

  it("R27 caps the text at 660 when there is room to spare", () => {
    const layout = getCommentsLayout(1439, sidebarRailWidth);

    expect(layout.textWidth).toBe(660);
  });

  it.each([1440, 1920, 2552])(
    "R04 returns the centred layout with a 300px margin at %ipx",
    (width) => {
      const layout = getCommentsLayout(width, DEFAULT_SIDEBAR_WIDTH);

      expect(layout).toMatchObject({
        mode: "centred",
        textWidth: null,
        marginWidth: 300,
      });
    }
  );

  it.each([1024, 768, 360])("R27 returns no margin layout at %ipx", (width) => {
    const layout = getCommentsLayout(width, sidebarRailWidth);

    expect(layout).toMatchObject({
      mode: "none",
      textWidth: null,
      marginWidth: 0,
    });
  });
});
