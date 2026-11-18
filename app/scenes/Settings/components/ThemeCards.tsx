import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { breakpoint } from "@shared/styles/breakpoint";
import { Theme } from "~/stores/UiStore";

const THEMES = [Theme.Light, Theme.Dark, Theme.System];

const PREVIEW = {
  light: {
    sidebar: "#F7F7F5",
    page: "#FFFFFF",
    title: "#16181D",
    line: "#D5D7DC",
  },
  dark: {
    sidebar: "#1D1F25",
    page: "#23252C",
    title: "#ECEDEF",
    line: "#464950",
  },
};

interface Props {
  label: string;
  checked: Theme;
  onSelect: (theme: Theme) => void;
}

/**
 * A radio group of the interface themes, each with a small preview.
 *
 * @param label accessible name of the group.
 * @param checked the theme to show as chosen.
 * @param onSelect called with the theme the user picks.
 * @returns the card group.
 */
export function ThemeCards({ label, checked, onSelect }: Props) {
  const { t } = useTranslation();
  const cardRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const cards = {
    [Theme.Light]: {
      name: t("Light"),
      note: t("White background"),
      previews: [PREVIEW.light],
    },
    [Theme.Dark]: {
      name: t("Dark"),
      note: t("Graphite background"),
      previews: [PREVIEW.dark],
    },
    [Theme.System]: {
      name: t("System"),
      note: t("Follows the operating system"),
      previews: [PREVIEW.light, PREVIEW.dark],
    },
  };

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
    const next = (index + step + THEMES.length) % THEMES.length;
    cardRefs.current[next]?.focus();
    onSelect(THEMES[next]);
  };

  return (
    <Grid role="radiogroup" aria-label={label}>
      {THEMES.map((theme, index) => (
        <Card
          key={theme}
          ref={(el) => {
            cardRefs.current[index] = el;
          }}
          type="button"
          role="radio"
          aria-checked={theme === checked}
          tabIndex={theme === checked ? 0 : -1}
          onClick={() => onSelect(theme)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          <Preview aria-hidden="true">
            {cards[theme].previews.map((colors) => (
              <Half key={colors.page}>
                <Side $bg={colors.sidebar} />
                <Page $bg={colors.page}>
                  <Bar $bg={colors.title} $width="60%" $height={6} />
                  <Bar $bg={colors.line} $width="86%" $height={4} />
                  <Bar $bg={colors.line} $width="70%" $height={4} />
                  <Button />
                </Page>
              </Half>
            ))}
          </Preview>
          <Name>{cards[theme].name}</Name>
          <Note>{cards[theme].note}</Note>
        </Card>
      ))}
    </Grid>
  );
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  margin-top: 12px;

  ${breakpoint("mobileLarge")`
    grid-template-columns: repeat(3, minmax(0, 1fr));
  `}
`;

const Card = styled.button`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 44px;
  padding: 8px 8px 12px;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  background: ${s("backgroundSecondary")};
  font: inherit;
  text-align: left;
  color: ${s("text")};
  cursor: var(--pointer);

  &[aria-checked="true"] {
    border-color: ${s("accent")};
    box-shadow: inset 0 0 0 1px ${s("accent")};
  }

  &:focus-visible {
    outline: 2px solid ${s("accent")};
    outline-offset: 2px;
  }
`;

const Preview = styled.span`
  display: flex;
  height: 70px;
  margin-bottom: 8px;
  border-radius: 6px;
  overflow: hidden;
`;

const Half = styled.span`
  display: flex;
  flex: 1;
`;

const Side = styled.i<{ $bg: string }>`
  width: 28%;
  background: ${(props) => props.$bg};
`;

const Page = styled.i<{ $bg: string }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  background: ${(props) => props.$bg};
`;

const Bar = styled.i<{ $bg: string; $width: string; $height: number }>`
  width: ${(props) => props.$width};
  height: ${(props) => props.$height}px;
  border-radius: 3px;
  background: ${(props) => props.$bg};
`;

const Button = styled.i`
  width: 32px;
  height: 10px;
  margin-top: auto;
  border-radius: 3px;
  background: ${s("accent")};
`;

const Name = styled.span`
  padding: 0 4px;
  font-size: 14px;
  font-weight: 500;
`;

const Note = styled.span`
  padding: 0 4px;
  font-size: 13px;
  color: ${s("textTertiary")};
`;
