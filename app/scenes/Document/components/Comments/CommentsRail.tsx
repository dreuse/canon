import { CommentIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";

export const CommentsRailWidth = 36;

interface Props {
  threadCount: number;
  onExpand: () => void;
}

export function CommentsRail({ threadCount, onExpand }: Props) {
  const { t } = useTranslation();

  return (
    <Rail type="button" onClick={onExpand} aria-label={t("Comments")}>
      <CommentIcon />
      <Label>
        {threadCount
          ? t("{{ count }} comments", { count: threadCount })
          : t("No comments yet")}
      </Label>
    </Rail>
  );
}

const Rail = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 100%;
  padding: 14px 0;
  border: 0;
  background: none;
  color: ${s("textTertiary")};
  cursor: pointer;

  &:hover {
    color: ${s("textSecondary")};
  }
`;

const Label = styled.span`
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 11px;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
