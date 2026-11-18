import { transparentize } from "polished";
import { CheckmarkIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled, { ThemeProvider } from "styled-components";
import { s } from "@shared/styles";
import { breakpoint } from "@shared/styles/breakpoint";
import {
  DARK_BACKGROUND,
  LIGHT_BACKGROUND,
  ON_ACCENT,
  formatRatio,
  whiteOnFillRatio,
} from "@shared/styles/customAccent";
import type { Palette, PaletteName } from "@shared/styles/palettes";
import { palettes } from "@shared/styles/palettes";
import type { DefaultTheme } from "styled-components";
import { unicodeCLDRtoBCP47 } from "@shared/utils/date";

export const PREVIEW_PRIMARY_TEST_ID = "accent-preview-primary";

const FOCUS_RING_ALPHA = 0.8;
const DEFAULT_PALETTE: PaletteName = "violet";

const cardPalettes = [
  ...palettes.filter((p) => p.name === DEFAULT_PALETTE),
  ...palettes.filter((p) => p.name !== DEFAULT_PALETTE),
];

interface CardsProps {
  labelledBy: string;
  checked: PaletteName | undefined;
  onSelect: (palette: Palette) => void;
}

interface PreviewProps {
  lightTheme: DefaultTheme;
  darkTheme: DefaultTheme;
}

/**
 * A radio group of the accent palettes, each with a swatch strip for both
 * themes and the contrast of white text on its button fill.
 *
 * @param labelledBy id of the heading that names the group.
 * @param checked the palette to show as chosen, or undefined for a custom accent.
 * @param onSelect called with the palette the admin picks.
 * @returns the card group.
 */
export function AccentPaletteCards({
  labelledBy,
  checked,
  onSelect,
}: CardsProps) {
  const { t, i18n } = useTranslation();
  const locale = unicodeCLDRtoBCP47(i18n.language);
  const idPrefix = React.useId();
  const cardRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const names: Record<PaletteName, string> = {
    violet: t("Violet"),
    blue: t("Blue"),
    graphite: t("Graphite"),
    teal: t("Teal"),
    clay: t("Clay"),
    crimson: t("Crimson"),
  };
  const checkedIndex = cardPalettes.findIndex((p) => p.name === checked);
  const tabbableIndex = Math.max(checkedIndex, 0);

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) {
      return;
    }
    event.preventDefault();
    const next = (index + step + cardPalettes.length) % cardPalettes.length;
    cardRefs.current[next]?.focus();
  };

  return (
    <Grid role="radiogroup" aria-labelledby={labelledBy}>
      {cardPalettes.map((palette, index) => (
        <Card
          key={palette.name}
          ref={(el) => {
            cardRefs.current[index] = el;
          }}
          type="button"
          role="radio"
          aria-checked={palette.name === checked}
          aria-labelledby={`${idPrefix}-${palette.name}-name`}
          aria-describedby={`${idPrefix}-${palette.name}-meta`}
          tabIndex={index === tabbableIndex ? 0 : -1}
          onClick={() => onSelect(palette)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          <Strip aria-hidden="true">
            <Half $bg={LIGHT_BACKGROUND} $link={palette.light.text}>
              <Chip $bg={palette.light.fill}>Aa</Chip>
              <u>link</u>
            </Half>
            <Half $bg={DARK_BACKGROUND} $link={palette.dark.text}>
              <Chip $bg={palette.dark.fill}>Aa</Chip>
              <u>link</u>
            </Half>
          </Strip>
          <Name id={`${idPrefix}-${palette.name}-name`}>
            {names[palette.name]}
            {palette.name === checked && (
              <Check aria-hidden="true">
                <CheckmarkIcon size={14} />
              </Check>
            )}
          </Name>
          <Meta id={`${idPrefix}-${palette.name}-meta`}>
            {t("Button {{light}}:1 in light · {{dark}}:1 in dark", {
              light: formatRatio(whiteOnFillRatio(palette.light.fill), locale),
              dark: formatRatio(whiteOnFillRatio(palette.dark.fill), locale),
            })}
          </Meta>
        </Card>
      ))}
    </Grid>
  );
}

/**
 * Two fixed illustrations, one per theme, rendered from the given theme
 * objects so the accent shows before it is saved.
 *
 * @param lightTheme the light theme built from the draft accent.
 * @param darkTheme the dark theme built from the draft accent.
 * @returns the side by side preview.
 */
export function AccentPalettePreview({ lightTheme, darkTheme }: PreviewProps) {
  const { t } = useTranslation();

  return (
    <Pair>
      <PreviewPanel label={t("Dark theme")} theme={darkTheme} />
      <PreviewPanel label={t("Light theme")} theme={lightTheme} />
    </Pair>
  );
}

function PreviewPanel({
  label,
  theme,
}: {
  label: string;
  theme: DefaultTheme;
}) {
  const { t } = useTranslation();

  return (
    <ThemeProvider theme={theme}>
      <div role="group" aria-label={label}>
        <PanelLabel aria-hidden="true">{label}</PanelLabel>
        <Frame>
          <Sidebar>
            <NavItem>{t("Home")}</NavItem>
            <NavItem $active>{t("Engineering")}</NavItem>
            <NavItem>{t("Product")}</NavItem>
            <NavItem>{t("Operations")}</NavItem>
          </Sidebar>
          <Content>
            <PanelTitle>{t("GitHub integration")}</PanelTitle>
            <PanelText>
              <Trans>
                Read the <u>webhooks guide</u> before you publish the change.
              </Trans>
            </PanelText>
            <Actions>
              <Primary
                data-testid={PREVIEW_PRIMARY_TEST_ID}
                data-fill={theme.accent}
              >
                {t("Publish")}
              </Primary>
              <Secondary>{t("Share")}</Secondary>
            </Actions>
            <FocusedInput>{t("Search in document")}</FocusedInput>
          </Content>
        </Frame>
      </div>
    </ThemeProvider>
  );
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  margin-top: 12px;

  ${breakpoint("mobileLarge")`
    grid-template-columns: repeat(2, minmax(0, 1fr));
  `}

  ${breakpoint("tablet")`
    grid-template-columns: repeat(3, minmax(0, 1fr));
  `}
`;

const Card = styled.button`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  background: ${s("backgroundSecondary")};
  font: inherit;
  text-align: left;
  color: ${s("text")};
  cursor: var(--pointer);

  &[aria-checked="true"] {
    border-color: ${s("link")};
    box-shadow: inset 0 0 0 1px ${s("link")};
  }

  &:focus-visible {
    outline: 2px solid ${s("link")};
    outline-offset: 2px;
  }
`;

const Strip = styled.span`
  display: flex;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
`;

const Half = styled.span<{ $bg: string; $link: string }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font: 600 12px/1 ${s("fontFamily")};
  background: ${(props) => props.$bg};
  color: ${(props) => props.$link};
  border: 1px solid ${s("divider")};

  &:first-child {
    border-radius: 6px 0 0 6px;
    border-right: 0;
  }

  &:last-child {
    border-radius: 0 6px 6px 0;
  }

  u {
    text-underline-offset: 2px;
    font-weight: 500;
  }
`;

const Chip = styled.b<{ $bg: string }>`
  padding: 4px 8px;
  border-radius: 4px;
  background: ${(props) => props.$bg};
  color: ${ON_ACCENT};
  font-weight: 600;
`;

const Name = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
`;

const Check = styled.span`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 9px;
  background: ${s("accent")};
  color: ${s("accentText")};

  svg {
    fill: currentColor;
  }
`;

const Meta = styled.span`
  font-size: 12px;
  line-height: 16px;
  color: ${s("textTertiary")};
`;

const Pair = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  margin-top: 12px;

  ${breakpoint("tablet")`
    grid-template-columns: 1fr 1fr;
  `}
`;

const PanelLabel = styled.p`
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${s("textTertiary")};
`;

const Frame = styled.div`
  display: flex;
  height: 196px;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  overflow: hidden;
  background: ${s("background")};
  color: ${s("text")};
`;

const Sidebar = styled.div`
  width: 112px;
  flex: none;
  padding: 10px 8px;
  background: ${s("sidebarBackground")};
  border-right: 1px solid ${s("divider")};
`;

const NavItem = styled.span<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  height: 26px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 12px;
  background: ${(props) =>
    props.$active ? s("backgroundQuaternary")(props) : "transparent"};
  color: ${(props) => (props.$active ? s("text")(props) : s("textSecondary")(props))};
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
  padding: 14px 16px;
`;

const PanelTitle = styled.p`
  margin: 0;
  font: 600 15px/20px ${s("fontFamily")};
`;

const PanelText = styled.p`
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: ${s("textSecondary")};

  u {
    color: ${s("link")};
    text-underline-offset: 2px;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 14px;
`;

const Button = styled.span`
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
`;

const Primary = styled(Button)`
  background: ${s("accent")};
  color: ${s("accentText")};
`;

const Secondary = styled(Button)`
  background: transparent;
  border: 1px solid ${s("divider")};
  color: ${s("text")};
`;

const FocusedInput = styled.div`
  display: flex;
  align-items: center;
  margin-top: 12px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid ${s("selected")};
  border-radius: 6px;
  font-size: 12px;
  box-shadow: 0 0 0 2px
    ${(props) => transparentize(FOCUS_RING_ALPHA, props.theme.selected)};
`;
