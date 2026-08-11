import { darken, lighten, transparentize } from "polished";
import type { DefaultTheme, Colors } from "styled-components";
import breakpoints from "./breakpoints";

const solarizedLight = {
  base3: "#FDF6E3",
  base2: "#EEE8D5",
  base1: "#93A1A1",
  base00: "#657B83",
  yellow: "#B58900",
  orange: "#CB4B16",
  red: "#DC322F",
  magenta: "#D33682",
  violet: "#6C71C4",
  blue: "#268BD2",
  cyan: "#2AA198",
  green: "#859900",
};

/**
 * Dark theme surfaces, each a fixed 1.30:1 over the plane below it. Near black
 * an equal step in lightness yields an ever smaller contrast ratio, so the
 * ladder is defined by ratio rather than by step. The sidebar is the floor and
 * sits below the content plane.
 */
const darkSidebar = "#1D1F25";
const darkContent = "#23252C";
const darkRaised = "#35383F";
const darkOverlay = "#464950";
const darkHairline = "#454C59";

const intellijDark = {
  background: "#1E1F22",
  border: "#35353B",
  text: "#BCBEC4",
  comment: "#505060",
  lineNumber: "#4B5059",
  keyword: "#CF8E6D",
  string: "#6AAB73",
  number: "#2AACB8",
  method: "#56A8F5",
  field: "#C77DBB",
  tag: "#D5B778",
  typeArgument: "#16BAAC",
  deletion: "#F75464",
};

const defaultColors: Colors = {
  transparent: "transparent",
  almostBlack: "#111319",
  lightBlack: "#2F3336",
  almostWhite: "#E6E6E6",
  veryDarkBlue: "#08090C",
  slate: "#66778F",
  slateLight: "#DAE1E9",
  slateDark: "#394351",
  smoke: "#F4F7FA",
  smokeLight: "#F9FBFC",
  smokeDark: "#E8EBED",
  white: "#FFFFFF",
  white05: "rgba(255, 255, 255, 0.05)",
  white10: "rgba(255, 255, 255, 0.1)",
  white50: "rgba(255, 255, 255, 0.5)",
  white75: "rgba(255, 255, 255, 0.75)",
  black: "#000",
  black05: "rgba(0, 0, 0, 0.05)",
  black10: "rgba(0, 0, 0, 0.1)",
  black50: "rgba(0, 0, 0, 0.50)",
  black75: "rgba(0, 0, 0, 0.75)",
  accent: "#0366d6",
  yellow: "#EDBA07",
  warmGrey: "hsl(60 9% 96% / 1)",
  danger: "#ed2651",
  warning: "#f08a24",
  success: "#3ad984",
  info: "#a0d3e8",
  brand: {
    red: "#FF5C80",
    pink: "#FF4DFA",
    purple: "#9E5CF7",
    blue: "#3633FF",
    marine: "#2BC2FF",
    dusk: "#2930FF",
    green: "#3ad984",
    yellow: "#F5BE31",
  },
};

/** The narrowest the content of a sidebar can be, excluding its padding. */
const sidebarMinWidth = 240;

const sidebarPadding = 16;

const spacing = {
  sidebarWidth: 260,
  sidebarRightWidth: 300,
  sidebarCollapsedWidth: 16,
  sidebarMinWidth,
  sidebarMaxWidth: 500,
  /** The narrowest a sidebar can be resized to, including its padding. */
  sidebarResizeMinWidth: sidebarMinWidth + sidebarPadding,
};

export type ThemeOverride = Partial<Colors> &
  Partial<Pick<DefaultTheme, "fontFamily" | "fontFamilyMono">>;

export const DEFAULT_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, Inter, 'Segoe UI', Roboto, Oxygen, sans-serif";
export const DEFAULT_FONT_FAMILY_MONO =
  "'Fira Code', 'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace";

const buildBaseTheme = (input: ThemeOverride) => {
  const colors = {
    ...defaultColors,
    ...input,
  };

  return {
    fontFamilyEmoji:
      "Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Segoe UI, Twemoji Mozilla, Noto Color Emoji, Android Emoji",
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    accentText: colors.white,
    selected: colors.accent,
    textHighlight: "#FDEA9B",
    textHighlightForeground: colors.almostBlack,
    commentMarkBackground: transparentize(0.5, colors.brand.marine),
    commentedImageOutlineDark: colors.brand.marine,
    commentedImageOutlineLight: transparentize(0.7, colors.brand.marine),
    code: colors.slateDark,
    codeComment: solarizedLight.base1,
    codePunctuation: colors.slateDark,
    codeNumber: solarizedLight.magenta,
    codeProperty: solarizedLight.violet,
    codeTag: solarizedLight.blue,
    codeClassName: solarizedLight.yellow,
    codeString: solarizedLight.cyan,
    codeSelector: solarizedLight.green,
    codeAttrName: solarizedLight.yellow,
    codeAttrValue: solarizedLight.cyan,
    codeEntity: solarizedLight.violet,
    codeKeyword: solarizedLight.green,
    codeFunction: solarizedLight.blue,
    codeStatement: solarizedLight.green,
    codePlaceholder: solarizedLight.base1,
    codeInserted: solarizedLight.green,
    codeImportant: solarizedLight.red,
    codeConstant: solarizedLight.orange,
    codeParameter: solarizedLight.violet,
    codeOperator: colors.slateDark,
    noticeInfoBackground: colors.brand.blue,
    noticeInfoText: colors.almostBlack,
    noticeTipBackground: "#f5be31",
    noticeTipText: colors.almostBlack,
    noticeWarningBackground: "#d73a49",
    noticeWarningText: colors.almostBlack,
    noticeSuccessBackground: colors.brand.green,
    noticeSuccessText: colors.almostBlack,
    tableSelectedBackground: transparentize(0.9, colors.accent),
    breakpoints,
    ...colors,
    ...spacing,
    fontFamily: input.fontFamily ?? DEFAULT_FONT_FAMILY,
    fontFamilyMono: input.fontFamilyMono ?? DEFAULT_FONT_FAMILY_MONO,
  };
};

export const buildLightTheme = (input: ThemeOverride): DefaultTheme => {
  const colors = buildBaseTheme(input);
  const sidebarBackground = "hsl(60 9% 96% / 1)";
  const sidebarHoverBackground = "hsl(60 9% 92% / 1)";
  const sidebarActiveBackground = "hsl(60 9% 89% / 1)";

  return {
    ...colors,
    isDark: false,
    background: colors.white,
    backgroundSecondary: colors.warmGrey,
    backgroundTertiary: sidebarHoverBackground,
    backgroundQuaternary: sidebarActiveBackground,
    commentsBackground: sidebarBackground,
    commentCardBackground: colors.white,
    link: colors.accent,
    cursor: colors.almostBlack,
    text: colors.almostBlack,
    textSecondary: colors.slateDark,
    textTertiary: "#596A81",
    textTertiaryOnTint: "#5A6980",
    textDiffInserted: colors.almostBlack,
    textDiffInsertedBackground: "rgba(18, 138, 41, 0.16)",
    textDiffDeleted: colors.slateDark,
    textDiffDeletedBackground: "rgba(255, 180, 173, 0.25)",
    placeholder: "#687786",
    sidebarBackground,
    sidebarHoverBackground,
    sidebarActiveBackground,
    sidebarControlHoverBackground: "rgb(138 164 193 / 20%)",
    sidebarDraftBorder: "hsl(212 31% 75% / 1)",
    sidebarText: "rgb(78, 92, 110)",
    backdrop: "rgba(0, 0, 0, 0.2)",
    shadow: "rgba(0, 0, 0, 0.2)",

    modalBackdrop: "rgba(0, 0, 0, 0.25)",
    modalBackground: colors.white,
    modalShadow:
      "0 0 0 1px rgb(0 0 0 / 10%), 0 4px 8px rgb(0 0 0 / 8%), 0 2px 4px rgb(0 0 0 / 0%), 0 30px 40px rgb(0 0 0 / 8%)",

    menuItemSelected: colors.warmGrey,
    menuBackground: colors.white,
    menuShadow:
      "0 0 0 1px rgb(0 0 0 / 10%), 0 4px 8px rgb(0 0 0 / 8%), 0 2px 4px rgb(0 0 0 / 0%), 0 30px 40px rgb(0 0 0 / 8%)",
    divider: sidebarHoverBackground,
    titleBarDivider: sidebarActiveBackground,
    inputBorder: sidebarActiveBackground,
    inputBorderFocused: colors.slate,
    inputBackground: colors.warmGrey,
    listItemHoverBackground: colors.warmGrey,
    mentionBackground: colors.warmGrey,
    mentionHoverBackground: sidebarActiveBackground,
    tableSelected: colors.accent,
    buttonNeutralBackground: colors.white,
    buttonNeutralHoverBackground: colors.warmGrey,
    buttonNeutralText: colors.almostBlack,
    buttonNeutralBorder: "hsl(212 31% 88% / 1)",
    tooltipBackground: colors.almostBlack,
    tooltipText: colors.white,
    toastBackground: colors.white,
    toastText: colors.almostBlack,
    quote: colors.slateLight,
    codeBackground: sidebarBackground,
    codeBorder: sidebarActiveBackground,
    embedBorder: colors.slateLight,
    horizontalRule: colors.smokeDark,
    progressBarBackground: colors.slateLight,
    scrollbarBackground: colors.smoke,
    scrollbarThumb: darken(0.15, colors.smokeDark),
    staleBackground: "#fdf6e7",
    staleBorder: "#f2e0b5",
    staleText: "#7c5510",
    freshText: "#0f7b52",
  };
};

export const buildDarkTheme = (input: ThemeOverride): DefaultTheme => {
  const colors = buildBaseTheme(input);
  const sidebarBackground = darkSidebar;
  const sidebarHoverBackground = darkContent;
  const sidebarActiveBackground = darkRaised;

  return {
    ...colors,
    isDark: true,
    background: darkContent,
    backgroundSecondary: darkRaised,
    backgroundTertiary: darkOverlay,
    backgroundQuaternary: lighten(0.06, darkOverlay),
    commentsBackground: sidebarBackground,
    commentCardBackground: darkRaised,
    link: "#5AA8FF",
    text: "#F2F3F5",
    cursor: colors.almostWhite,
    textSecondary: "#C2C9D4",
    textTertiary: "#9AA4B3",
    textTertiaryOnTint: "#8B95A5",
    textDiffInserted: colors.almostWhite,
    textDiffInsertedBackground: "rgba(63,185,80,0.25)",
    textDiffDeleted: darken(0.1, colors.almostWhite),
    textDiffDeletedBackground: "rgba(248,81,73,0.15)",
    placeholder: "#7C8598",
    sidebarBackground,
    sidebarHoverBackground,
    sidebarActiveBackground,
    sidebarControlHoverBackground: colors.white10,
    sidebarDraftBorder: lighten(0.2, colors.veryDarkBlue),
    sidebarText: "#8d97a8",
    backdrop: "rgba(0, 0, 0, 0.5)",
    shadow: "rgba(0, 0, 0, 0.6)",

    modalBackdrop: colors.black50,
    modalBackground: darkOverlay,
    modalShadow:
      "0 0 0 1px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.08)",

    menuItemSelected: darkOverlay,
    menuBackground: darkRaised,
    menuShadow:
      "0 0 0 1px rgb(34 40 52), 0 8px 16px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.08)",
    divider: darkHairline,
    titleBarDivider: darken(0.4, colors.slate),
    inputBorder: darkHairline,
    inputBorderFocused: colors.slate,
    inputBackground: darkRaised,
    listItemHoverBackground: colors.white10,
    mentionBackground: lighten(0.09, colors.veryDarkBlue),
    mentionHoverBackground: lighten(0.15, colors.veryDarkBlue),
    tableSelected: colors.accent,
    buttonNeutralBackground: darkRaised,
    buttonNeutralHoverBackground: darkOverlay,
    buttonNeutralText: colors.white,
    buttonNeutralBorder: darkHairline,
    tooltipBackground: colors.white,
    tooltipText: colors.lightBlack,
    toastBackground: darkRaised,
    toastText: colors.almostWhite,
    quote: colors.almostWhite,
    code: intellijDark.text,
    codeBackground: intellijDark.background,
    codeBorder: darkRaised,
    codeComment: intellijDark.comment,
    codePunctuation: intellijDark.text,
    codeProperty: intellijDark.field,
    codeNumber: intellijDark.number,
    codeTag: intellijDark.tag,
    codeOperator: intellijDark.text,
    codeConstant: intellijDark.field,
    codeParameter: intellijDark.text,
    codeSelector: intellijDark.tag,
    codeEntity: intellijDark.typeArgument,
    codeStatement: intellijDark.keyword,
    codeInserted: intellijDark.string,
    codeString: intellijDark.string,
    codeKeyword: intellijDark.keyword,
    codeFunction: intellijDark.method,
    codeClassName: intellijDark.text,
    codeImportant: intellijDark.deletion,
    codeAttrName: intellijDark.text,
    codeAttrValue: intellijDark.string,
    codePlaceholder: intellijDark.text,
    embedBorder: colors.black50,
    horizontalRule: darkHairline,
    noticeInfoText: colors.white,
    noticeTipText: colors.white,
    noticeWarningText: colors.white,
    noticeSuccessText: colors.white,
    progressBarBackground: colors.slate,
    scrollbarBackground: colors.black,
    scrollbarThumb: colors.lightBlack,
    staleBackground: "#2b2314",
    staleBorder: "#4a3c1c",
    staleText: "#e0b969",
    freshText: "#4fc08d",
  };
};

export const buildPitchBlackTheme = (input: ThemeOverride) => {
  const colors = buildDarkTheme(input);

  return {
    ...colors,
    background: colors.black,
    codeBackground: colors.almostBlack,
    commentsBackground: colors.black,
    commentCardBackground: colors.almostBlack,
  };
};

export const light = buildLightTheme(defaultColors);

export default light as DefaultTheme;
