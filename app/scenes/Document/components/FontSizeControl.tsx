import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { observer } from "mobx-react";
import type { ReactNode } from "react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import NudeButton from "~/components/NudeButton";
import { useMenuContext } from "~/components/primitives/Menu/MenuContext";
import useKeyDown from "~/hooks/useKeyDown";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import { FONT_SCALE_MAX, FONT_SCALE_MIN } from "~/stores/UiStore";

const SMALL_GLYPH_SIZE = 11;
const LARGE_GLYPH_SIZE = 15;
const DECREASE_SHORTCUT = "Ctrl+Alt+-";
const INCREASE_SHORTCUT = "Ctrl+Alt+=";

interface SizeItemProps {
  label: string;
  title: string;
  disabled: boolean;
  onSelect: () => void;
  children: ReactNode;
}

function SizeItem({
  label,
  title,
  disabled,
  onSelect,
  children,
}: SizeItemProps) {
  const { variant } = useMenuContext();
  const isMobile = useMobile();

  const button = (
    <SizeButton
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={isMobile ? onSelect : undefined}
    >
      {children}
    </SizeButton>
  );

  if (isMobile) {
    return button;
  }

  const Item =
    variant === "dropdown"
      ? DropdownMenuPrimitive.Item
      : ContextMenuPrimitive.Item;

  return (
    <Item
      asChild
      disabled={disabled}
      onSelect={(event) => {
        event.preventDefault();
        onSelect();
      }}
    >
      {button}
    </Item>
  );
}

/**
 * Registers the keyboard shortcuts that change the text size.
 */
export function useFontSizeShortcuts() {
  const { ui } = useStores();

  useKeyDown(
    (event) =>
      event.ctrlKey &&
      event.altKey &&
      (event.code === "Minus" || event.code === "NumpadSubtract"),
    () => ui.adjustFontScale(-1),
    { allowInInput: true }
  );
  useKeyDown(
    (event) =>
      event.ctrlKey &&
      event.altKey &&
      (event.code === "Equal" || event.code === "NumpadAdd"),
    () => ui.adjustFontScale(1),
    { allowInInput: true }
  );
}

function FontSizeControl() {
  const { ui } = useStores();
  const { t } = useTranslation();

  const decrease = useCallback(() => ui.adjustFontScale(-1), [ui]);
  const increase = useCallback(() => ui.adjustFontScale(1), [ui]);

  const percent = Math.round(ui.fontScale * 100);

  return (
    <Row role="group" aria-label={t("Text size")}>
      <Label>{t("Text size")}</Label>
      <SizeItem
        label={t("Decrease text size")}
        title={`${t("Decrease text size")} (${percent}%) ${DECREASE_SHORTCUT}`}
        onSelect={decrease}
        disabled={ui.fontScale <= FONT_SCALE_MIN}
      >
        <Glyph $size={SMALL_GLYPH_SIZE}>A</Glyph>
      </SizeItem>
      <SizeItem
        label={t("Increase text size")}
        title={`${t("Increase text size")} (${percent}%) ${INCREASE_SHORTCUT}`}
        onSelect={increase}
        disabled={ui.fontScale >= FONT_SCALE_MAX}
      >
        <Glyph $size={LARGE_GLYPH_SIZE}>A</Glyph>
      </SizeItem>
    </Row>
  );
}

const Row = styled.div`
  display: flex;
  align-items: center;
`;

const Label = styled.span`
  flex-grow: 1;
  color: ${s("textSecondary")};
`;

const SizeButton = styled(NudeButton)`
  width: 28px;
  height: 32px;
  color: ${s("textSecondary")};
  border-radius: 4px;
  transition: background 100ms ease-in-out;

  &:hover:enabled {
    background: ${s("buttonNeutralHoverBackground")};
    transition: none;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const Glyph = styled.span<{ $size: number }>`
  font-size: ${(props) => props.$size}px;
  font-weight: 600;
  line-height: 1;
`;

export default observer(FontSizeControl);
