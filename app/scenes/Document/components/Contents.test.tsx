import { activationLine } from "./Contents";

const VIEWPORT = 800;
const LONG_PAGE = 4000;
const MAX_SCROLL = LONG_PAGE - VIEWPORT;
const TOP_OFFSET = 20;

describe("activationLine", () => {
  it("sits near the viewport top until the last screen of scrolling", () => {
    expect(
      activationLine({
        viewportHeight: VIEWPORT,
        scrollY: MAX_SCROLL - VIEWPORT,
        scrollHeight: LONG_PAGE,
      })
    ).toBe(TOP_OFFSET);
  });

  it("moves halfway down the viewport halfway through the last screen", () => {
    expect(
      activationLine({
        viewportHeight: VIEWPORT,
        scrollY: MAX_SCROLL - VIEWPORT / 2,
        scrollHeight: LONG_PAGE,
      })
    ).toBe(TOP_OFFSET + (VIEWPORT - TOP_OFFSET) / 2);
  });

  it("reaches the viewport bottom at the end of the page", () => {
    expect(
      activationLine({
        viewportHeight: VIEWPORT,
        scrollY: MAX_SCROLL,
        scrollHeight: LONG_PAGE,
      })
    ).toBe(VIEWPORT);
  });

  it("starts near the top and ends at the bottom on a page that scrolls less than a screen", () => {
    const shortPage = VIEWPORT + 100;

    expect(
      activationLine({
        viewportHeight: VIEWPORT,
        scrollY: 0,
        scrollHeight: shortPage,
      })
    ).toBe(TOP_OFFSET);
    expect(
      activationLine({
        viewportHeight: VIEWPORT,
        scrollY: 100,
        scrollHeight: shortPage,
      })
    ).toBe(VIEWPORT);
  });

  it("stays near the top on a page that does not scroll", () => {
    expect(
      activationLine({
        viewportHeight: VIEWPORT,
        scrollY: 0,
        scrollHeight: VIEWPORT,
      })
    ).toBe(TOP_OFFSET);
  });
});
