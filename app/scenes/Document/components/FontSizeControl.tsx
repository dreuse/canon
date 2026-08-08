import { observer } from "mobx-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useKeyDown from "~/hooks/useKeyDown";
import useStores from "~/hooks/useStores";
import { FONT_SCALE_MAX, FONT_SCALE_MIN } from "~/stores/UiStore";

function FontSizeControl() {
  const { ui } = useStores();
  const { t } = useTranslation();

  const decrease = useCallback(() => ui.adjustFontScale(-1), [ui]);
  const increase = useCallback(() => ui.adjustFontScale(1), [ui]);

  useKeyDown(
    (event) =>
      event.ctrlKey &&
      event.altKey &&
      (event.code === "Minus" || event.code === "NumpadSubtract"),
    decrease,
    { allowInInput: true }
  );
  useKeyDown(
    (event) =>
      event.ctrlKey &&
      event.altKey &&
      (event.code === "Equal" || event.code === "NumpadAdd"),
    increase,
    { allowInInput: true }
  );

  const percent = Math.round(ui.fontScale * 100);

  return (
    <Group role="group" aria-label={t("Text size")}>
      <Tooltip
        content={`${t("Decrease text size")} (${percent}%)`}
        shortcut="Ctrl+Alt+-"
        placement="bottom"
      >
        <SizeButton
          aria-label={t("Decrease text size")}
          onClick={decrease}
          disabled={ui.fontScale <= FONT_SCALE_MIN}
        >
          <Glyph $size={11}>A</Glyph>
        </SizeButton>
      </Tooltip>
      <Tooltip
        content={`${t("Increase text size")} (${percent}%)`}
        shortcut="Ctrl+Alt+="
        placement="bottom"
      >
        <SizeButton
          aria-label={t("Increase text size")}
          onClick={increase}
          disabled={ui.fontScale >= FONT_SCALE_MAX}
        >
          <Glyph $size={15}>A</Glyph>
        </SizeButton>
      </Tooltip>
    </Group>
  );
}

const Group = styled.span`
  display: inline-flex;
  align-items: center;
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
