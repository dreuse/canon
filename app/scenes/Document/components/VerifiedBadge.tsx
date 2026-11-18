import { observer } from "mobx-react";
import { CheckmarkIcon } from "outline-icons";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Time from "~/components/Time";
import useStores from "~/hooks/useStores";
import type Document from "~/models/Document";

const COMPACT_ICON_SIZE = 16;

interface Props {
  document: Document;
  /** Show only a check mark and "Verified", without who verified or when. */
  compact?: boolean;
}

export const VerifiedBadge = observer(function VerifiedBadge({
  document,
  compact,
}: Props) {
  const { t } = useTranslation();
  const { users } = useStores();
  const { verifiedAt, verifiedById } = document;
  const verifiedBy = verifiedById ? users.get(verifiedById) : undefined;

  useEffect(() => {
    if (verifiedById && !verifiedBy) {
      void users.fetch(verifiedById).catch(() => undefined);
    }
  }, [users, verifiedById, verifiedBy]);

  if (
    !verifiedAt ||
    document.isStale ||
    document.archivedAt ||
    document.deletedAt
  ) {
    return null;
  }

  if (compact) {
    return (
      <Badge>
        <CheckmarkIcon size={COMPACT_ICON_SIZE} />
        {t("Verified")}
      </Badge>
    );
  }

  return (
    <Badge>
      <Dot />
      {verifiedBy
        ? t("Verified by {{userName}}", { userName: verifiedBy.name })
        : t("Verified")}
      &nbsp;
      <Time dateTime={verifiedAt} addSuffix />
    </Badge>
  );
});

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 12px;
  background: ${s("backgroundSecondary")};
  color: ${s("freshText")};
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
`;

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
`;
