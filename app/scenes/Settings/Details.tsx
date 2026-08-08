import { isHexColor } from "class-validator";
import { pickBy } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { TeamIcon } from "outline-icons";
import { useRef, useState } from "react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { ThemeProvider } from "styled-components";
import { errToString } from "@shared/utils/error";
import { buildDarkTheme, buildLightTheme } from "@shared/styles/theme";
import {
  BodyFontFamilyStacks,
  MonospaceFontFamilyStacks,
} from "@shared/constants";
import type { Palette } from "@shared/styles/palettes";
import {
  palettes,
  paletteToCustomTheme,
  accentTextFor,
  isAccentLegible,
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
import { getBaseDomain } from "@shared/utils/domains";
import { TeamValidation } from "@shared/validations";
import Button from "~/components/Button";
import ButtonLink from "~/components/ButtonLink";
import DefaultCollectionInputSelect from "~/components/DefaultCollectionInputSelect";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import InputColor from "~/components/InputColor";
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import isCloudHosted from "~/utils/isCloudHosted";
import TeamDelete from "../TeamDelete";
import { ActionRow } from "./components/ActionRow";
import ImageInput from "./components/ImageInput";
import SettingRow from "./components/SettingRow";
import styled from "styled-components";
import { s } from "@shared/styles";

function Details() {
  const { dialogs, ui } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const can = usePolicy(team);

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
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || "");
  const [subdomain, setSubdomain] = useState(team.subdomain);
  const [publicBranding, setPublicBranding] = useState(
    team.preferences?.publicBranding
  );
  const [defaultCollectionId, setDefaultCollectionId] = useState<string | null>(
    team.defaultCollectionId
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

  const handleMonospaceFontFamilyChange = React.useCallback(
    (value: string) => {
      setMonospaceFontFamily(value as MonospaceFontFamily);
    },
    []
  );

  const handleFontSizeChange = React.useCallback((value: string) => {
    setFontSize(value as FontSize);
  }, []);

  const handleCodeFontSizeChange = React.useCallback((value: string) => {
    setCodeFontSize(value as CodeFontSize);
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
          name,
          description,
          subdomain,
          defaultCollectionId,
          preferences: {
            ...team.preferences,
            publicBranding,
            customTheme,
            tocPosition,
            bodyFontFamily,
            monospaceFontFamily,
            fontSize,
            codeFontSize,
          },
        });
        toast.success(t("Settings saved"));
      } catch (err) {
        toast.error(errToString(err));
      }
    },
    [
      tocPosition,
      team,
      name,
      description,
      subdomain,
      defaultCollectionId,
      publicBranding,
      customTheme,
      bodyFontFamily,
      monospaceFontFamily,
      fontSize,
      codeFontSize,
      illegibleAccents,
      t,
    ]
  );

  const handleNameChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setName(ev.target.value);
    },
    []
  );

  const handleSubdomainChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setSubdomain(ev.target.value.toLowerCase());
    },
    []
  );

  const handleAvatarChange = async (avatarUrl: string | null) => {
    await team.save({ avatarUrl });
    toast.success(t("Logo updated"));
  };

  const handleAvatarError = React.useCallback(
    (error: string | null | undefined) => {
      toast.error(error || t("Unable to upload new logo"));
    },
    [t]
  );

  const showDeleteWorkspace = () => {
    dialogs.openModal({
      title: t("Delete workspace"),
      content: <TeamDelete onSubmit={dialogs.closeAllModals} />,
    });
  };

  const onSelectCollection = React.useCallback((value: string) => {
    const selectedValue = value === "home" ? null : value;
    setDefaultCollectionId(selectedValue);
  }, []);

  const handleSeamlessEditChange = React.useCallback(
    async (checked: boolean) => {
      team.setPreference(TeamPreference.SeamlessEdit, !checked);
      await team.save();
      toast.success(t("Settings saved"));
    },
    [team, t]
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

  return (
    <ThemeProvider theme={newTheme}>
      <Scene title={t("Details")} icon={<TeamIcon />}>
        <Heading>{t("Details")}</Heading>
        <Text as="p" type="secondary">
          <Trans>
            These settings affect the way that your workspace appears to
            everyone on the team.
          </Trans>
        </Text>

        <form onSubmit={handleSubmit} ref={form}>
          <Heading as="h2">{t("Display")}</Heading>
          <SettingRow
            label={t("Logo")}
            name="avatarUrl"
            description={t(
              "The logo is displayed at the top left of the application."
            )}
          >
            <ImageInput
              alt={t("Workspace logo")}
              onSuccess={handleAvatarChange}
              onError={handleAvatarError}
              model={team}
              borderRadius={0}
            />
          </SettingRow>
          <SettingRow
            label={t("Name")}
            name="name"
            description={t(
              "The workspace name, usually the same as your company name."
            )}
          >
            <Input
              id="name"
              autoComplete="organization"
              value={name}
              onChange={handleNameChange}
              maxLength={TeamValidation.maxNameLength}
              showCharacterCount
              required
            />
          </SettingRow>
          <SettingRow
            label={t("Description")}
            name="description"
            description={t("A short description of your workspace.")}
          >
            <Input
              id="description"
              value={description}
              onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
                setDescription(ev.target.value);
              }}
              maxLength={TeamValidation.maxDescriptionLength}
              showCharacterCount
            />
          </SettingRow>
          <SettingRow
            label={t("Theme")}
            name="accent"
            description={
              <>
                {t("Customize the interface look and feel.")}{" "}
                {accent && (
                  <>
                    <ButtonLink
                      onClick={() => {
                        setAccent(null);
                        setAccentText(null);
                      }}
                    >
                      {t("Reset theme")}
                    </ButtonLink>
                  </>
                )}
              </>
            }
          >
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
            <InputColor
              id="accent"
              value={accent ?? newTheme.accent}
              label={t("Accent color")}
              onChange={handleAccentChange}
              flex
            />
            <InputColor
              id="accentText"
              value={accentText ?? newTheme.accentText}
              label={t("Accent text color")}
              onChange={setAccentText}
              flex
            />
            <InputColor
              id="accentDark"
              value={accentDark ?? newTheme.accent}
              label={t("Accent color in dark mode")}
              onChange={handleAccentDarkChange}
              flex
            />
            {illegibleAccents.length > 0 && (
              <AccentWarning role="alert">
                {t(
                  "This accent falls below {{ ratio }}:1 against the page in {{ themes }} — pick a stronger color.",
                  {
                    ratio: MIN_ACCENT_CONTRAST,
                    themes: illegibleAccents.join(", "),
                  }
                )}
              </AccentWarning>
            )}
          </SettingRow>
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
          {(team.avatarUrl || team.description) && (
            <SettingRow
              name={TeamPreference.PublicBranding}
              label={t("Public branding")}
              description={t(
                "Show your workspace logo, description, and branding on publicly shared pages."
              )}
            >
              <Switch
                id={TeamPreference.PublicBranding}
                name={TeamPreference.PublicBranding}
                checked={publicBranding}
                onChange={(checked: boolean) => setPublicBranding(checked)}
              />
            </SettingRow>
          )}
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

          <Heading as="h2">{t("Behavior")}</Heading>

          <SettingRow
            visible={isCloudHosted}
            label={t("Subdomain")}
            name="subdomain"
            description={
              subdomain ? (
                <>
                  <Trans>Your workspace will be accessible at</Trans>{" "}
                  <strong>
                    {subdomain}.{getBaseDomain()}
                  </strong>
                </>
              ) : (
                t(
                  "Choose a subdomain to enable a login page just for your team."
                )
              )
            }
          >
            <Input
              id="subdomain"
              value={subdomain || ""}
              onChange={handleSubdomainChange}
              autoComplete="off"
              minLength={TeamValidation.minSubdomainLength}
              maxLength={
                isCloudHosted
                  ? TeamValidation.maxSubdomainLength
                  : TeamValidation.maxSubdomainSelfHostedLength
              }
            />
          </SettingRow>
          <SettingRow
            label={t("Start view")}
            name="defaultCollectionId"
            description={t(
              "This is the screen that workspace members will first see when they sign in."
            )}
          >
            <DefaultCollectionInputSelect
              onSelectCollection={onSelectCollection}
              defaultCollectionId={defaultCollectionId}
            />
          </SettingRow>
          <SettingRow
            border={false}
            name={TeamPreference.SeamlessEdit}
            label={t("Separate editing")}
            description={t(
              "When enabled documents have a separate editing mode by default instead of being always editable. This setting can be overridden by user preferences."
            )}
          >
            <Switch
              id={TeamPreference.SeamlessEdit}
              name={TeamPreference.SeamlessEdit}
              checked={!team.getPreference(TeamPreference.SeamlessEdit)}
              onChange={handleSeamlessEditChange}
            />
          </SettingRow>

          <ActionRow>
            <Button type="submit" disabled={team.isSaving || !isValid}>
              {team.isSaving ? `${t("Saving")}…` : t("Save")}
            </Button>
          </ActionRow>

          {can.delete && (
            <>
              <p>&nbsp;</p>

              <Heading as="h2">{t("Danger")}</Heading>
              <SettingRow
                name="delete"
                border={false}
                label={t("Delete workspace")}
                description={t(
                  "You can delete this entire workspace including collections, documents, and users."
                )}
              >
                <span>
                  <Button onClick={showDeleteWorkspace} neutral>
                    {t("Delete workspace")}…
                  </Button>
                </span>
              </SettingRow>
            </>
          )}
        </form>
      </Scene>
    </ThemeProvider>
  );
}

export default observer(Details);

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

const AccentWarning = styled.p`
  margin: 6px 0 0;
  font-size: 13px;
  color: ${s("danger")};
`;
