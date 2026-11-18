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
  paletteToCustomTheme,
  findSavedPalette,
  checkedPaletteName,
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
import {
  AccentPaletteCards,
  AccentPalettePreview,
} from "./components/AccentPaletteCards";
import { SettingGroup } from "./components/SettingGroup";
import { Description } from "./components/SettingsSection";
import SettingRow from "./components/SettingRow";

import { SettingsTitle } from "./components/SettingsTitle";
const DEFAULT_CODE_THEME = "default";
const ACCENT_HEADING_ID = "accent-heading";
const PREVIEW_HEADING_ID = "preview-heading";

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
          <AccentSection aria-labelledby={ACCENT_HEADING_ID}>
            <SectionHeading id={ACCENT_HEADING_ID}>
              {t("Accent color")}
            </SectionHeading>
            <Description as="p">
              {t(
                "Appears on primary buttons, links, focus and the active item. Each palette has a tone tuned for each theme, and all pass 4.5:1."
              )}
            </Description>
            <AccentPaletteCards
              labelledBy={ACCENT_HEADING_ID}
              checked={checkedPaletteName(customTheme)}
              onSelect={handlePaletteSelect}
            />
            {accent && (
              <Text as="p" type="secondary" size="small">
                <ButtonLink onClick={handleResetTheme}>
                  {t("Reset theme")}
                </ButtonLink>
              </Text>
            )}
          </AccentSection>

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

          <PreviewSection aria-labelledby={PREVIEW_HEADING_ID}>
            <SectionHeading id={PREVIEW_HEADING_ID}>
              {t("Preview")}
            </SectionHeading>
            <Description as="p">
              {t("The same color in both themes, as members will see it.")}
            </Description>
            <AccentPalettePreview
              lightTheme={lightPreview}
              darkTheme={darkPreview}
            />
          </PreviewSection>

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

const AccentSection = styled.section`
  margin-top: 24px;
`;

const PreviewSection = styled.section`
  margin-top: 45px;
`;

const SectionHeading = styled.h2`
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
  color: ${s("text")};
`;
