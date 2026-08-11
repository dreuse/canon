import { transparentize } from "polished";
import type { DefaultTheme } from "styled-components";
import { isTouchDevice } from "../utils/browser";

export { default as depths } from "./depths";

export { default as breakpoints } from "./breakpoints";

/**
 * Returns "hover" on a non-touch device and "active" on a touch device. To
 * avoid "sticky" hover on mobile. Use `&:${hover} {...}` instead of
 * using `&:hover {...}`.
 */
export const hover = isTouchDevice() ? "active" : "hover";

/**
 * Mixin to make text ellipse when it overflows.
 *
 * @returns string of CSS
 */
export const ellipsis = () => `
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

/**
 * Mixin to return a theme value.
 *
 * @returns a theme value
 */
export const s =
  (key: keyof DefaultTheme) => (props: { theme: DefaultTheme }) =>
    props.theme[key] as string;

export const hairline = (props: { theme: DefaultTheme }) =>
  transparentize(0.55, props.theme.divider);

/**
 * Mixin for the edge of a card. The dark theme separates surfaces by fill, so
 * the card needs no edge there; the light theme has no room above white and
 * separates by hairline instead. Kept as a transparent border in dark so the
 * box model does not change between themes.
 *
 * @returns a border color.
 */
export const cardBorder = (props: { theme: DefaultTheme }) =>
  props.theme.isDark ? "transparent" : transparentize(0.5, props.theme.divider);

/**
 * Mixin to hide scrollbars.
 *
 * @returns string of CSS
 */
export const hideScrollbars = () => `
  -ms-overflow-style: none;
  overflow: -moz-scrollbars-none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

/**
 * Mixin on any component with relative positioning to add additional hidden clickable/hoverable area
 *
 * @param pixels
 * @returns
 */
export const extraArea = (pixels: number): string => `
  &::before {
    position: absolute;
    content: "";
    top: -${pixels}px;
    right: -${pixels}px;
    left: -${pixels}px;
    bottom: -${pixels}px;
  }
`;

/**
 * Truncate multiline text.
 *
 * @returns string of CSS
 */
export const truncateMultiline = (lines: number) => `
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${lines};
  overflow: hidden;
  overflow-wrap: anywhere;
`;
