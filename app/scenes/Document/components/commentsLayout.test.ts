import { sidebarRailWidth, sidebarPanelWidth } from "@shared/styles/theme";
import { getCentredMarginShift, getCommentsLayout } from "./commentsLayout";

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

describe("getCentredMarginShift", () => {
  it.each([
    { width: 1440, textEnd: 1024, columnStart: 1140, shift: 76 },
    { width: 1920, textEnd: 1430, columnStart: 1620, shift: 150 },
    { width: 2552, textEnd: 1670, columnStart: 2252, shift: 542 },
  ])(
    "R04 pulls the cards to 40px from the text at $width",
    ({ textEnd, columnStart, shift }) => {
      expect(getCentredMarginShift(textEnd, columnStart)).toBe(shift);
    }
  );

  it("R04 does not push the cards when the text is already within 40px", () => {
    expect(getCentredMarginShift(1100, 1140)).toBe(0);
    expect(getCentredMarginShift(1120, 1140)).toBe(0);
  });
});
