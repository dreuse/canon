import type { TFunction } from "i18next";
import { CheckmarkIcon, WarningIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type { AccentCheck } from "@shared/styles/customAccent";
import { MIN_ACCENT_CONTRAST, formatRatio } from "@shared/styles/customAccent";
import depths from "@shared/styles/depths";
import { resolveAccent } from "@shared/styles/palettes";
import type { CustomTheme } from "@shared/types";
import { s } from "@shared/styles";
import { unicodeCLDRtoBCP47 } from "@shared/utils/date";
import Button from "~/components/Button";
import Text from "~/components/Text";

const HEX_PLACEHOLDER = "#";
const HEX_MAX_LENGTH = 7;
const DISABLED_OPACITY = 0.45;

interface AccentDraft {
  accent?: string | null;
  accentDark?: string | null;
}

interface EditorProps {
  light: string;
  dark: string;
  lightCheck: AccentCheck;
  darkCheck: AccentCheck;
  onLightChange: (value: string) => void;
  onDarkChange: (value: string) => void;
}

interface SaveBarProps {
  isDirty: boolean;
  isSaving: boolean;
  accentLabel?: string;
  lightCheck: AccentCheck;
  darkCheck: AccentCheck;
  onDiscard: () => void;
}

/**
 * Picks the value each theme field shows. A palette shows its tuned fill, and
 * a field the admin has typed in shows the typed value, so the gate checks what
 * the admin sees.
 *
 * @param draft the unsaved accent values, as typed.
 * @param customTheme the valid hex values of the draft.
 * @param isCustomEdit whether the admin typed in a field since the last palette pick.
 * @returns the light and dark values to show and check.
 */
export function getAccentFills(
  draft: AccentDraft,
  customTheme: Partial<CustomTheme>,
  isCustomEdit: boolean
) {
  const fill = (raw: string | null | undefined, isDark: boolean) =>
    isCustomEdit && raw
      ? raw
      : (resolveAccent(customTheme, isDark).accent ?? "");
  return {
    light: fill(draft.accent, false),
    dark: fill(draft.accentDark, true),
  };
}

/**
 * Explains why the accent cannot be saved yet.
 *
 * @param lightCheck the check of the light theme value.
 * @param darkCheck the check of the dark theme value.
 * @param t the translation function.
 * @returns the reason, or undefined when both values can be saved.
 */
export function getAccentBlockReason(
  lightCheck: AccentCheck,
  darkCheck: AccentCheck,
  t: TFunction
): string | undefined {
  if (!lightCheck.isValid || !darkCheck.isValid) {
    return t("Enter a six-digit hex color, such as #6B46C1.");
  }
  if (!lightCheck.passes && !darkCheck.passes) {
    return t(
      "The light and dark theme accents are below the minimum contrast."
    );
  }
  if (!lightCheck.passes) {
    return t("The light theme accent is below the minimum contrast.");
  }
  if (!darkCheck.passes) {
    return t("The dark theme accent is below the minimum contrast.");
  }
  return undefined;
}

/**
 * Two hex inputs, one per theme, that check the contrast of each value.
 */
export function CustomAccentEditor({
  light,
  dark,
  lightCheck,
  darkCheck,
  onLightChange,
  onDarkChange,
}: EditorProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <AccentRow
        id="accent"
        label={t("Accent · light theme")}
        description={t("Buttons, links and focus in the light theme.")}
        value={light}
        check={lightCheck}
        isDark={false}
        onChange={onLightChange}
      />
      <AccentRow
        id="accentDark"
        label={t("Accent · dark theme")}
        description={t(
          "Buttons and focus in the dark theme. Links use a lighter tone generated from this one."
        )}
        value={dark}
        check={darkCheck}
        isDark
        onChange={onDarkChange}
      />
    </Card>
  );
}

/**
 * A bar fixed at the bottom of the settings column that saves or discards the
 * unsaved changes. Save is a submit button, so render it inside the form.
 */
export function AccentSaveBar({
  isDirty,
  isSaving,
  accentLabel,
  lightCheck,
  darkCheck,
  onDiscard,
}: SaveBarProps) {
  const { t } = useTranslation();
  const reason = getAccentBlockReason(lightCheck, darkCheck, t);
  const title = reason ? t("Cannot save yet") : t("Unsaved changes");
  const description =
    reason ??
    (accentLabel ? t("Accent color: {{ name }}", { name: accentLabel }) : "");

  if (!isDirty) {
    return null;
  }

  return (
    <Bar role="region" aria-label={title}>
      <BarText>
        {title}
        {description && <BarDescription>{description}</BarDescription>}
      </BarText>
      <Button type="button" neutral onClick={onDiscard} disabled={isSaving}>
        {t("Discard")}
      </Button>
      <SaveButton type="submit" disabled={isSaving || !!reason}>
        {isSaving ? `${t("Saving")}…` : t("Save changes")}
      </SaveButton>
    </Bar>
  );
}

interface RowProps {
  id: string;
  label: string;
  description: string;
  value: string;
  check: AccentCheck;
  isDark: boolean;
  onChange: (value: string) => void;
}

function AccentRow({
  id,
  label,
  description,
  value,
  check,
  isDark,
  onChange,
}: RowProps) {
  const { t, i18n } = useTranslation();
  const locale = unicodeCLDRtoBCP47(i18n.language);
  const format = (ratio: number) => formatRatio(ratio, locale);
  const messageId = `${id}-gate`;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange(event.target.value.replace(/^#?/, "#"));

  const handleUseSuggestion = () => onChange(check.suggestion);

  return (
    <Row>
      <RowText>
        <Text as="label" htmlFor={id} weight="bold">
          {label}
        </Text>
        <Text as="p" type="secondary">
          {description}
        </Text>
      </RowText>
      <HexField $invalid={!check.passes}>
        <Dot $color={check.isValid ? value : "transparent"} />
        <HexInput
          id={id}
          value={value}
          placeholder={HEX_PLACEHOLDER}
          maxLength={HEX_MAX_LENGTH}
          aria-invalid={!check.passes}
          aria-describedby={messageId}
          onChange={handleChange}
        />
      </HexField>
      {check.passes ? (
        <Pass id={messageId}>
          <CheckmarkIcon size={16} />
          {isDark
            ? t(
                "White text on the button: {{ ratio }}:1. Links on the dark background: {{ linkRatio }}:1. Passed.",
                {
                  ratio: format(check.ratio),
                  linkRatio: format(check.linkRatio),
                }
              )
            : t(
                "White text on the button: {{ ratio }}:1. Links on the light background: {{ linkRatio }}:1. Passed.",
                {
                  ratio: format(check.ratio),
                  linkRatio: format(check.linkRatio),
                }
              )}
        </Pass>
      ) : (
        <Gate id={messageId} role="alert">
          <GateIcon size={20} />
          <GateText>
            {check.isValid
              ? [
                  t(
                    "White text on {{ color }} is {{ ratio }}:1, and the minimum is {{ min }}:1. A similar tone that passes is {{ suggestion }} ({{ suggestionRatio }}:1).",
                    {
                      color: value,
                      ratio: format(check.ratio),
                      min: format(MIN_ACCENT_CONTRAST),
                      suggestion: check.suggestion,
                      suggestionRatio: format(check.suggestionRatio),
                    }
                  ),
                  isDark &&
                    t("Links would use {{ linkTone }} ({{ linkRatio }}:1).", {
                      linkTone: check.linkTone,
                      linkRatio: format(check.linkRatio),
                    }),
                ]
                  .filter(Boolean)
                  .join(" ")
              : t("Enter a six-digit hex color, such as #6B46C1.")}
          </GateText>
          {check.isValid && (
            <Button type="button" neutral onClick={handleUseSuggestion}>
              {t("Use {{ color }}", { color: check.suggestion })}
            </Button>
          )}
        </Gate>
      )}
    </Row>
  );
}

const Card = styled.div`
  border: 1px solid ${s("divider")};
  border-radius: 8px;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 40px;
  padding: 16px;

  & + & {
    border-top: 1px solid ${s("divider")};
  }
`;

const RowText = styled.div`
  flex: 1 1 240px;
  min-width: 0;

  p {
    margin: 0;
  }
`;

const HexField = styled.span<{ $invalid: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 200px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid
    ${(props) => (props.$invalid ? props.theme.danger : s("inputBorder"))};
  border-radius: 6px;
  color: ${s("text")};

  &:focus-within {
    border-color: ${(props) =>
      props.$invalid ? props.theme.danger : s("inputBorderFocused")};
  }
`;

const Dot = styled.span<{ $color: string }>`
  flex: none;
  width: 18px;
  height: 18px;
  border: 1px solid ${s("divider")};
  border-radius: 4px;
  background: ${(props) => props.$color};
`;

const HexInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-transform: uppercase;
`;

const Pass = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-basis: 100%;
  margin: 0;
  font-size: 13px;
  color: ${(props) =>
    props.theme.isDark ? props.theme.success : props.theme.textSecondary};

  svg {
    flex: none;
  }
`;

const Gate = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-basis: 100%;
  padding: 10px 12px;
  border: 1px solid ${s("danger")};
  border-radius: 6px;
  font-size: 13px;
  line-height: 18px;
  color: ${s("text")};
`;

const GateIcon = styled(WarningIcon)`
  flex: none;
  fill: ${s("danger")};
`;

const GateText = styled.span`
  flex: 1;
`;

const Bar = styled.div`
  position: sticky;
  bottom: 24px;
  z-index: ${depths.documentFooter};
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding: 10px 10px 10px 16px;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  font-size: 14px;
  color: ${s("text")};
`;

const SaveButton = styled(Button)`
  &:disabled {
    opacity: ${DISABLED_OPACITY};
  }
`;

const BarText = styled.span`
  flex: 1;
  min-width: 0;
`;

const BarDescription = styled.span`
  display: block;
  font-size: 13px;
  color: ${s("textTertiary")};
`;
