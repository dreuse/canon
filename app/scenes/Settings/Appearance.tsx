import { isHexColor } from "class-validator";
import { pickBy } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { PaletteIcon } from "outline-icons";
import { useRef, useState } from "react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import styled, { ThemeProvider } from "styled-components";
import { errToString } from "@shared/utils/error";
import { s } from "@shared/styles";
import { buildDarkTheme, buildLightTheme } from "@shared/styles/theme";
import {
  BodyFontFamilyStacks,
  MonospaceFontFamilyStacks,
} from "@shared/constants";
import type { Palette } from "@shared/styles/palettes";
import {
  palettes,
  paletteToCustomTheme,
  accentContrast,
  accentTextFor,
  isAccentLegible,
  resolveAccent,
  MIN_ACCENT_CONTRAST,
} from "@shared/styles/palettes";
import type { CustomTheme } from "@shared/types";
import {
  BodyFontFamily,
  CodeFontSize,
  FontSize,
  MonospaceFontFamily,
  TOCPosition,
  TeamPreference,
} from "@shared/types";
import Button from "~/components/Button";
import ButtonLink from "~/components/ButtonLink";
import InputColor from "~/components/InputColor";
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import { ActionRow } from "./components/ActionRow";
import { SettingGroup } from "./components/SettingGroup";
import SettingRow from "./components/SettingRow";

import { SettingsTitle } from "./components/SettingsTitle";
const DEFAULT_CODE_THEME = "default";

const WARN_ACCENT_CONTRAST = 3;

function Appearance() {
  const { ui } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();

  const form = useRef<HTMLFormElement>(null);
  const [accent, setAccent] = useState<null | undefined | string>(
    team.preferences?.customTheme?.accent
  );
  const [accentText, setAccentText] = useState<null | undefined | string>(
    team.preferences?.customTheme?.accentText
  );
  const [accentDark, setAccentDark] = useState<null | undefined | string>(
    team.preferences?.customTheme?.accentDark
  );
  const [accentTextDark, setAccentTextDark] = useState<
    null | undefined | string
  >(team.preferences?.customTheme?.accentTextDark);

  const illegibleAccents = React.useMemo(() => {
    const failing: string[] = [];
    if (accent && !isAccentLegible(accent, false)) {
      failing.push(t("light mode"));
    }
    const darkAccent = accentDark ?? accent;
    if (darkAccent && !isAccentLegible(darkAccent, true)) {
      failing.push(t("dark mode"));
    }
    return failing;
  }, [accent, accentDark, t]);

  const handleAccentChange = React.useCallback((value: string) => {
    setAccent(value);
    setAccentText(accentTextFor(value));
  }, []);

  const handleAccentDarkChange = React.useCallback((value: string) => {
    setAccentDark(value);
    setAccentTextDark(accentTextFor(value));
  }, []);

  const handlePaletteSelect = React.useCallback((palette: Palette) => {
    const next = paletteToCustomTheme(palette);
    setAccent(next.accent);
    setAccentText(next.accentText);
    setAccentDark(next.accentDark);
    setAccentTextDark(next.accentTextDark);
  }, []);

  const [bodyFontFamily, setBodyFontFamily] = useState(
    team.getPreference(TeamPreference.BodyFontFamily) || BodyFontFamily.Default
  );
  const [monospaceFontFamily, setMonospaceFontFamily] = useState(
    team.getPreference(TeamPreference.MonospaceFontFamily) ||
      MonospaceFontFamily.FiraCode
  );
  const [fontSize, setFontSize] = useState(
    team.getPreference(TeamPreference.FontSize) || FontSize.Default
  );
  const [codeFontSize, setCodeFontSize] = useState(
    team.getPreference(TeamPreference.CodeFontSize) || CodeFontSize.Default
  );

  const customTheme: Partial<CustomTheme> = pickBy(
    {
      accent,
      accentText,
      accentDark,
      accentTextDark,
    },
    isHexColor
  );

  const [tocPosition, setTocPosition] = useState(
    team.getPreference(TeamPreference.TocPosition) as TOCPosition
  );

  const [codeTheme, setCodeTheme] = useState(() => {
    const stored = team.getPreference(TeamPreference.CodeTheme);
    return typeof stored === "string" ? stored : DEFAULT_CODE_THEME;
  });

  const tocPositionOptions: Option[] = React.useMemo(
    () =>
      [
        {
          type: "item",
          label: t("Left"),
          value: TOCPosition.Left,
        },
        {
          type: "item",
          label: t("Right"),
          value: TOCPosition.Right,
        },
      ] satisfies Option[],
    [t]
  );

  const handleTocPositionChange = React.useCallback((position: string) => {
    setTocPosition(position as TOCPosition);
  }, []);

  const bodyFontFamilyOptions: Option[] = React.useMemo(
    () =>
      [
        {
          type: "item",
          label: t("Default"),
          value: BodyFontFamily.Default,
        },
        {
          type: "item",
          label: t("IBM Plex Sans"),
          value: BodyFontFamily.IBMPlexSans,
        },
        {
          type: "item",
          label: t("Source Serif"),
          value: BodyFontFamily.SourceSerif,
        },
        {
          type: "item",
          label: t("Lora"),
          value: BodyFontFamily.Lora,
        },
        {
          type: "item",
          label: t("System serif"),
          value: BodyFontFamily.Serif,
        },
      ] satisfies Option[],
    [t]
  );

  const monospaceFontFamilyOptions: Option[] = React.useMemo(
    () =>
      [
        {
          type: "item",
          label: t("Fira Code"),
          value: MonospaceFontFamily.FiraCode,
        },
        {
          type: "item",
          label: t("JetBrains Mono"),
          value: MonospaceFontFamily.JetBrainsMono,
        },
        {
          type: "item",
          label: t("IBM Plex Mono"),
          value: MonospaceFontFamily.IBMPlexMono,
        },
        {
          type: "item",
          label: t("System monospace"),
          value: MonospaceFontFamily.System,
        },
      ] satisfies Option[],
    [t]
  );

  const fontSizeOptions: Option[] = React.useMemo(
    () =>
      [
        {
          type: "item",
          label: t("Small"),
          value: FontSize.Small,
        },
        {
          type: "item",
          label: t("Default"),
          value: FontSize.Default,
        },
        {
          type: "item",
          label: t("Large"),
          value: FontSize.Large,
        },
        {
          type: "item",
          label: t("Extra large"),
          value: FontSize.ExtraLarge,
        },
      ] satisfies Option[],
    [t]
  );

  const codeThemeOptions: Option[] = React.useMemo(
    () =>
      [
        {
          type: "item",
          label: t("Match workspace theme"),
          value: DEFAULT_CODE_THEME,
        },
        { type: "item", label: t("Paper"), value: "paper" },
        { type: "item", label: t("Slate"), value: "slate" },
        { type: "item", label: t("Midnight"), value: "midnight" },
        { type: "item", label: t("Plum"), value: "plum" },
      ] satisfies Option[],
    [t]
  );

  const codeFontSizeOptions: Option[] = React.useMemo(
    () =>
      [
        {
          type: "item",
          label: t("Small"),
          value: CodeFontSize.Small,
        },
        {
          type: "item",
          label: t("Default"),
          value: CodeFontSize.Default,
        },
        {
          type: "item",
          label: t("Large"),
          value: CodeFontSize.Large,
        },
        {
          type: "item",
          label: t("Extra large"),
          value: CodeFontSize.ExtraLarge,
        },
      ] satisfies Option[],
    [t]
  );

  const handleBodyFontFamilyChange = React.useCallback((value: string) => {
    setBodyFontFamily(value as BodyFontFamily);
  }, []);

  const handleMonospaceFontFamilyChange = React.useCallback((value: string) => {
    setMonospaceFontFamily(value as MonospaceFontFamily);
  }, []);

  const handleFontSizeChange = React.useCallback((value: string) => {
    setFontSize(value as FontSize);
  }, []);

  const handleCodeFontSizeChange = React.useCallback((value: string) => {
    setCodeFontSize(value as CodeFontSize);
  }, []);

  const handleCodeThemeChange = React.useCallback((value: string) => {
    setCodeTheme(value);
  }, []);

  const handleSubmit = React.useCallback(
    async (event?: React.SyntheticEvent) => {
      if (event) {
        event.preventDefault();
      }

      if (illegibleAccents.length > 0) {
        toast.error(
          t(
            "This accent falls below {{ ratio }}:1 against the page in {{ themes }} — pick a stronger color.",
            {
              ratio: MIN_ACCENT_CONTRAST,
              themes: illegibleAccents.join(", "),
            }
          )
        );
        return;
      }

      try {
        await team.save({
          preferences: {
            ...team.preferences,
            customTheme,
            tocPosition,
            bodyFontFamily,
            monospaceFontFamily,
            fontSize,
            codeFontSize,
            codeTheme: codeTheme === DEFAULT_CODE_THEME ? null : codeTheme,
          },
        });
        toast.success(t("Settings saved"));
      } catch (err) {
        toast.error(errToString(err));
      }
    },
    [
      team,
      customTheme,
      tocPosition,
      bodyFontFamily,
      monospaceFontFamily,
      fontSize,
      codeFontSize,
      codeTheme,
      illegibleAccents,
      t,
    ]
  );

  const isValid = form.current?.checkValidity();

  const themeOverride = React.useMemo(
    () => ({
      ...customTheme,
      fontFamily: BodyFontFamilyStacks[bodyFontFamily],
      fontFamilyMono: MonospaceFontFamilyStacks[monospaceFontFamily],
    }),
    [customTheme, bodyFontFamily, monospaceFontFamily]
  );

  const newTheme = React.useMemo(
    () =>
      ui.resolvedTheme === "light"
        ? buildLightTheme(themeOverride)
        : buildDarkTheme(themeOverride),
    [themeOverride, ui.resolvedTheme]
  );

  const isDarkUi = ui.resolvedTheme === "dark";

  const lightPreview = React.useMemo(
    () => buildLightTheme(resolveAccent(customTheme, false)),
    [customTheme]
  );

  const darkPreview = React.useMemo(
    () => buildDarkTheme(resolveAccent(customTheme, true)),
    [customTheme]
  );

  const contrast = React.useMemo(() => {
    const safe = (value: string | null | undefined, fallback: string) =>
      value && isHexColor(value) ? value : fallback;
    const lightRatio = accentContrast(safe(accent, lightPreview.accent), false);
    const darkRatio = accentContrast(
      safe(accentDark ?? accent, darkPreview.accent),
      true
    );
    const worst = Math.min(lightRatio, darkRatio);
    return {
      light: lightRatio.toFixed(1),
      dark: darkRatio.toFixed(1),
      state:
        worst >= MIN_ACCENT_CONTRAST
          ? "pass"
          : worst >= WARN_ACCENT_CONTRAST
            ? "warn"
            : "fail",
    };
  }, [accent, accentDark, lightPreview.accent, darkPreview.accent]);

  const handleResetTheme = React.useCallback(() => {
    setAccent(null);
    setAccentText(null);
    setAccentDark(null);
    setAccentTextDark(null);
  }, []);

  const renderSample = (
    sample: ReturnType<typeof buildLightTheme>,
    dark: boolean
  ) => (
    <PreviewCard $bg={sample.background} $text={sample.text} $divided={dark}>
      <PreviewTitle>{team.name}</PreviewTitle>
      <PreviewMeta $color={sample.textSecondary}>
        <PreviewLink $color={sample.accent}>{t("All collections")}</PreviewLink>
        {` · ${t("updated today")}`}
      </PreviewMeta>
      <PreviewButtons>
        <PreviewPrimary $bg={sample.accent} $fg={sample.accentText}>
          {t("Publish")}
        </PreviewPrimary>
        <PreviewSecondary $border={sample.divider} $fg={sample.text}>
          {t("Share")}
        </PreviewSecondary>
      </PreviewButtons>
    </PreviewCard>
  );

  return (
    <ThemeProvider theme={newTheme}>
      <Scene title={t("Appearance")} icon={<PaletteIcon />}>
        <SettingsTitle title={t("Appearance")}>
          <Trans>
            Theme, accent colour, fonts and text size. Everyone on the team sees
            these.
          </Trans>
        </SettingsTitle>

        <form onSubmit={handleSubmit} ref={form}>
          <SettingGroup>{t("Palette")}</SettingGroup>
          <PaletteBlock>
            <PaletteFields>
              <Palettes>
                {palettes.map((palette) => (
                  <Swatch
                    key={palette.name}
                    type="button"
                    aria-label={palette.name}
                    aria-pressed={accent === palette.accent}
                    $color={palette.accent}
                    $selected={accent === palette.accent}
                    onClick={() => handlePaletteSelect(palette)}
                  />
                ))}
              </Palettes>
              <Text as="p" type="secondary" size="small">
                {t(
                  "A preset is a pair — one accent for light, one lifted for dark."
                )}{" "}
                {accent && (
                  <ButtonLink onClick={handleResetTheme}>
                    {t("Reset theme")}
                  </ButtonLink>
                )}
              </Text>
              <AccentFields>
                <InputColor
                  id="accent"
                  value={accent ?? lightPreview.accent}
                  label={t("Accent · light")}
                  onChange={handleAccentChange}
                  flex
                />
                <InputColor
                  id="accentDark"
                  value={accentDark ?? darkPreview.accent}
                  label={t("Accent · dark")}
                  onChange={handleAccentDarkChange}
                  flex
                />
              </AccentFields>
              <Contrast
                role="status"
                data-state={contrast.state}
                $state={contrast.state}
                $dark={isDarkUi}
              >
                {t(
                  "{{ light }}:1 on the light page · {{ dark }}:1 on the dark page",
                  { light: contrast.light, dark: contrast.dark }
                )}
              </Contrast>
            </PaletteFields>

            <PreviewColumn>
              <PreviewLabel>{t("Preview")}</PreviewLabel>
              <PreviewFrame>
                {renderSample(lightPreview, false)}
                {renderSample(darkPreview, true)}
              </PreviewFrame>
              <Text as="p" type="secondary" size="small">
                {t(
                  "Both themes, always. An accent is only correct if it is correct twice."
                )}
              </Text>
            </PreviewColumn>
          </PaletteBlock>

          <SettingGroup>{t("Reading")}</SettingGroup>
          <SettingRow
            label={t("Body font")}
            name={TeamPreference.BodyFontFamily}
            description={t("The font used for the main body of text.")}
          >
            <InputSelect
              options={bodyFontFamilyOptions}
              value={bodyFontFamily}
              onChange={handleBodyFontFamilyChange}
              label={t("Body font")}
              labelHidden
            />
          </SettingRow>
          <SettingRow
            label={t("Text size")}
            name={TeamPreference.FontSize}
            description={t("The size of body text in documents.")}
          >
            <InputSelect
              options={fontSizeOptions}
              value={fontSize}
              onChange={handleFontSizeChange}
              label={t("Text size")}
              labelHidden
            />
          </SettingRow>
          <SettingRow
            label={t("Code font")}
            name={TeamPreference.MonospaceFontFamily}
            description={t("The font used for code blocks and inline code.")}
          >
            <InputSelect
              options={monospaceFontFamilyOptions}
              value={monospaceFontFamily}
              onChange={handleMonospaceFontFamilyChange}
              label={t("Code font")}
              labelHidden
            />
          </SettingRow>
          <SettingRow
            label={t("Code size")}
            name={TeamPreference.CodeFontSize}
            description={t("The size of code blocks and inline code.")}
          >
            <InputSelect
              options={codeFontSizeOptions}
              value={codeFontSize}
              onChange={handleCodeFontSizeChange}
              label={t("Code size")}
              labelHidden
            />
          </SettingRow>
          <SettingRow
            border={false}
            label={t("Code theme")}
            name={TeamPreference.CodeTheme}
            description={t(
              "The palette used to highlight code blocks and inline code."
            )}
          >
            <InputSelect
              options={codeThemeOptions}
              value={codeTheme}
              onChange={handleCodeThemeChange}
              label={t("Code theme")}
              labelHidden
            />
          </SettingRow>

          <SettingRow
            border={false}
            label={t("Table of contents position")}
            name="tocPosition"
            description={t(
              "The side to display the table of contents in relation to the main content."
            )}
          >
            <InputSelect
              options={tocPositionOptions}
              value={tocPosition}
              onChange={handleTocPositionChange}
              label={t("Table of contents position")}
              labelHidden
            />
          </SettingRow>

          <ActionRow>
            <Button type="submit" disabled={team.isSaving || !isValid}>
              {team.isSaving ? `${t("Saving")}…` : t("Save")}
            </Button>
          </ActionRow>
        </form>
      </Scene>
    </ThemeProvider>
  );
}

export default observer(Appearance);

const Palettes = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
`;

const Swatch = styled.button<{ $color: string; $selected: boolean }>`
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  border-radius: 6px;
  cursor: var(--pointer);
  background: ${(props) => props.$color};
  border: 2px solid
    ${(props) => (props.$selected ? props.theme.text : "transparent")};
  box-shadow: inset 0 0 0 1px ${s("inputBorder")};

  &:focus-visible {
    outline: 2px solid ${s("accent")};
    outline-offset: 2px;
  }
`;

const PaletteBlock = styled.div`
  display: flex;
  gap: 40px;
  align-items: flex-start;
  padding-block: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 20px;
  }
`;

const PaletteFields = styled.div`
  flex: 1;
  min-width: 0;
`;

const AccentFields = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 12px;

  > * {
    flex: 1;
    min-width: 0;
  }
`;

const CONTRAST_COLORS = {
  pass: ["#EAF6EE", "#BFE3CC", "#1c6b3a", "#12291c", "#2b5138", "#7fd3a0"],
  warn: ["#FDF6E7", "#EBD9A8", "#7a5a12", "#2a2413", "#4f4526", "#e2c877"],
  fail: ["#FBEDEE", "#EFC7CC", "#a02231", "#2b1518", "#5a2b31", "#f09aa5"],
};

const Contrast = styled.p<{ $state: string; $dark: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 11px;
  border-radius: 7px;
  font-size: 12.5px;
  font-weight: 500;

  background: ${(props) =>
    CONTRAST_COLORS[props.$state as keyof typeof CONTRAST_COLORS][
      props.$dark ? 3 : 0
    ]};
  border: 1px solid
    ${(props) =>
      CONTRAST_COLORS[props.$state as keyof typeof CONTRAST_COLORS][
        props.$dark ? 4 : 1
      ]};
  color: ${(props) =>
    CONTRAST_COLORS[props.$state as keyof typeof CONTRAST_COLORS][
      props.$dark ? 5 : 2
    ]};
`;

const PreviewColumn = styled.div`
  flex: 0 0 300px;
  width: 300px;

  @media (max-width: 768px) {
    flex: 1 1 auto;
    width: 100%;
  }
`;

const PreviewLabel = styled.p`
  margin: 0 0 6px;
  font-size: 13px;
  color: ${s("textSecondary")};
`;

const PreviewFrame = styled.div`
  border: 1px solid ${s("divider")};
  border-radius: 9px;
  overflow: hidden;
`;

const PreviewCard = styled.div<{
  $bg: string;
  $text: string;
  $divided: boolean;
}>`
  padding: 12px 13px;
  background: ${(props) => props.$bg};
  color: ${(props) => props.$text};
  border-top: ${(props) => (props.$divided ? "1px solid" : "0")};
  border-color: ${s("divider")};
`;

const PreviewTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
`;

const PreviewMeta = styled.div<{ $color: string }>`
  margin-top: 3px;
  font-size: 12.5px;
  color: ${(props) => props.$color};
`;

const PreviewLink = styled.span<{ $color: string }>`
  color: ${(props) => props.$color};
`;

const PreviewButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`;

const PreviewPrimary = styled.span<{ $bg: string; $fg: string }>`
  padding: 5px 11px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 600;
  background: ${(props) => props.$bg};
  color: ${(props) => props.$fg};
`;

const PreviewSecondary = styled.span<{ $border: string; $fg: string }>`
  padding: 5px 11px;
  border-radius: 6px;
  font-size: 12.5px;
  border: 1px solid ${(props) => props.$border};
  color: ${(props) => props.$fg};
`;
