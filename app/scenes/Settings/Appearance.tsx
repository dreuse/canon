import { isHexColor } from "class-validator";
import { pickBy } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { PaletteIcon } from "outline-icons";
import { useState } from "react";
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
import { ON_ACCENT, checkAccent } from "@shared/styles/customAccent";
import type { Palette, PaletteName } from "@shared/styles/palettes";
import {
  palettes,
  paletteToCustomTheme,
  findSavedPalette,
  resolveAccent,
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
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import {
  AccentSaveBar,
  CustomAccentEditor,
  getAccentBlockReason,
  getAccentFills,
} from "./components/CustomAccentEditor";
import { SettingGroup } from "./components/SettingGroup";
import SettingRow from "./components/SettingRow";

import { SettingsTitle } from "./components/SettingsTitle";
const DEFAULT_CODE_THEME = "default";

function readSavedDraft(team: ReturnType<typeof useCurrentTeam>) {
  const customTheme = team.preferences?.customTheme;
  const codeTheme = team.getPreference(TeamPreference.CodeTheme);
  return {
    accent: customTheme?.accent ?? null,
    accentText: customTheme?.accentText ?? null,
    accentDark: customTheme?.accentDark ?? null,
    accentTextDark: customTheme?.accentTextDark ?? null,
    bodyFontFamily:
      team.getPreference(TeamPreference.BodyFontFamily) ||
      BodyFontFamily.Default,
    monospaceFontFamily:
      team.getPreference(TeamPreference.MonospaceFontFamily) ||
      MonospaceFontFamily.FiraCode,
    fontSize: team.getPreference(TeamPreference.FontSize) || FontSize.Default,
    codeFontSize:
      team.getPreference(TeamPreference.CodeFontSize) || CodeFontSize.Default,
    tocPosition: team.getPreference(TeamPreference.TocPosition) as TOCPosition,
    codeTheme: typeof codeTheme === "string" ? codeTheme : DEFAULT_CODE_THEME,
  };
}

function Appearance() {
  const { ui } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();

  const saved = readSavedDraft(team);
  const [accent, setAccent] = useState<null | undefined | string>(saved.accent);
  const [accentText, setAccentText] = useState<null | undefined | string>(
    saved.accentText
  );
  const [accentDark, setAccentDark] = useState<null | undefined | string>(
    saved.accentDark
  );
  const [accentTextDark, setAccentTextDark] = useState<
    null | undefined | string
  >(saved.accentTextDark);
  const [isEditorOpen, setEditorOpen] = useState(
    () =>
      !!saved.accent &&
      !findSavedPalette({
        accent: saved.accent ?? undefined,
        accentDark: saved.accentDark ?? undefined,
      })
  );

  const [isCustomEdit, setCustomEdit] = useState(false);

  const handlePaletteSelect = React.useCallback((palette: Palette) => {
    setCustomEdit(false);
    const next = paletteToCustomTheme(palette);
    setAccent(next.accent);
    setAccentText(next.accentText);
    setAccentDark(next.accentDark);
    setAccentTextDark(next.accentTextDark);
  }, []);

  const isPaletteSelected = (palette: Palette) =>
    accent?.toLowerCase() === palette.light.fill.toLowerCase();

  const [bodyFontFamily, setBodyFontFamily] = useState(saved.bodyFontFamily);
  const [monospaceFontFamily, setMonospaceFontFamily] = useState(
    saved.monospaceFontFamily
  );
  const [fontSize, setFontSize] = useState(saved.fontSize);
  const [codeFontSize, setCodeFontSize] = useState(saved.codeFontSize);
  const [tocPosition, setTocPosition] = useState(saved.tocPosition);

  const [codeTheme, setCodeTheme] = useState(saved.codeTheme);

  const customTheme: Partial<CustomTheme> = pickBy(
    {
      accent,
      accentText,
      accentDark,
      accentTextDark,
    },
    isHexColor
  );

  const { light: lightFill, dark: darkFill } = getAccentFills(
    { accent, accentDark },
    customTheme,
    isCustomEdit
  );
  const lightCheck = checkAccent(lightFill, false);
  const darkCheck = checkAccent(darkFill, true);

  const handleLightChange = (value: string) => {
    setCustomEdit(true);
    setAccent(value);
    setAccentText(ON_ACCENT);
    setAccentDark(darkFill);
    setAccentTextDark(ON_ACCENT);
  };

  const handleDarkChange = (value: string) => {
    setCustomEdit(true);
    setAccent(lightFill);
    setAccentText(ON_ACCENT);
    setAccentDark(value);
    setAccentTextDark(ON_ACCENT);
  };

  const isAccentDirty =
    JSON.stringify([accent, accentText, accentDark, accentTextDark]) !==
    JSON.stringify([
      saved.accent,
      saved.accentText,
      saved.accentDark,
      saved.accentTextDark,
    ]);
  const isDirty =
    isAccentDirty ||
    JSON.stringify([
      bodyFontFamily,
      monospaceFontFamily,
      fontSize,
      codeFontSize,
      tocPosition,
      codeTheme,
    ]) !==
      JSON.stringify([
        saved.bodyFontFamily,
        saved.monospaceFontFamily,
        saved.fontSize,
        saved.codeFontSize,
        saved.tocPosition,
        saved.codeTheme,
      ]);

  const paletteNames: Record<PaletteName, string> = {
    violet: t("Violet"),
    blue: t("Blue"),
    graphite: t("Graphite"),
    teal: t("Teal"),
    clay: t("Clay"),
    crimson: t("Crimson"),
  };
  const selectedPalette = findSavedPalette(customTheme);
  const accentLabel = !isAccentDirty
    ? undefined
    : selectedPalette
      ? paletteNames[selectedPalette.name]
      : accent
        ? t("Custom accent")
        : paletteNames.violet;

  const handleDiscard = () => {
    setCustomEdit(false);
    setAccent(saved.accent);
    setAccentText(saved.accentText);
    setAccentDark(saved.accentDark);
    setAccentTextDark(saved.accentTextDark);
    setBodyFontFamily(saved.bodyFontFamily);
    setMonospaceFontFamily(saved.monospaceFontFamily);
    setFontSize(saved.fontSize);
    setCodeFontSize(saved.codeFontSize);
    setTocPosition(saved.tocPosition);
    setCodeTheme(saved.codeTheme);
  };

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

      if (getAccentBlockReason(lightCheck, darkCheck, t)) {
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
      lightCheck,
      darkCheck,
      t,
    ]
  );

  const themeOverride = React.useMemo(
    () => ({
      ...customTheme,
      ...resolveAccent(customTheme, ui.resolvedTheme === "dark"),
      fontFamily: BodyFontFamilyStacks[bodyFontFamily],
      fontFamilyMono: MonospaceFontFamilyStacks[monospaceFontFamily],
    }),
    [customTheme, ui.resolvedTheme, bodyFontFamily, monospaceFontFamily]
  );

  const newTheme = React.useMemo(
    () =>
      ui.resolvedTheme === "light"
        ? buildLightTheme(themeOverride)
        : buildDarkTheme(themeOverride),
    [themeOverride, ui.resolvedTheme]
  );

  const lightPreview = React.useMemo(
    () => buildLightTheme(resolveAccent(customTheme, false)),
    [customTheme]
  );

  const darkPreview = React.useMemo(
    () => buildDarkTheme(resolveAccent(customTheme, true)),
    [customTheme]
  );

  const handleResetTheme = React.useCallback(() => {
    setCustomEdit(false);
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
        <PreviewLink $color={sample.link}>{t("All collections")}</PreviewLink>
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
            Theme, accent color, fonts and text size. Everyone on the team sees
            these.
          </Trans>
        </SettingsTitle>

        <form onSubmit={handleSubmit}>
          <SettingGroup>{t("Palette")}</SettingGroup>
          <PaletteBlock>
            <PaletteFields>
              <Palettes>
                {palettes.map((palette) => (
                  <Swatch
                    key={palette.name}
                    type="button"
                    aria-label={palette.name}
                    aria-pressed={isPaletteSelected(palette)}
                    $color={palette.light.fill}
                    $selected={isPaletteSelected(palette)}
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

          <SettingRow
            border={false}
            label={t("Custom colors")}
            name="customColors"
            description={t(
              "Set your own tone for each theme. Contrast is checked before you save."
            )}
          >
            <Button
              id="customColors"
              type="button"
              neutral
              aria-expanded={isEditorOpen}
              onClick={() => setEditorOpen((open) => !open)}
            >
              {t("Customize")}
            </Button>
          </SettingRow>
          {isEditorOpen && (
            <CustomAccentEditor
              light={lightFill}
              dark={darkFill}
              lightCheck={lightCheck}
              darkCheck={darkCheck}
              onLightChange={handleLightChange}
              onDarkChange={handleDarkChange}
            />
          )}

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

          <AccentSaveBar
            isDirty={isDirty}
            isSaving={team.isSaving}
            accentLabel={accentLabel}
            lightCheck={lightCheck}
            darkCheck={darkCheck}
            onDiscard={handleDiscard}
          />
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
    outline: 2px solid ${s("selected")};
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
