import { differenceInDays } from "date-fns";
import { observer } from "mobx-react";
import { TrashIcon, ArchiveIcon } from "outline-icons";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type Document from "~/models/Document";
import ErrorBoundary from "~/components/ErrorBoundary";
import Notice from "~/components/Notice";
import Time from "~/components/Time";
import usePolicy from "~/hooks/usePolicy";

type Props = {
  document: Document;
  readOnly: boolean;
};

function Days(props: { dateTime: string }) {
  const { t } = useTranslation();
  const days = differenceInDays(new Date(props.dateTime), new Date());

  return (
    <>
      {t(`{{ count }} days`, {
        count: days,
      })}
    </>
  );
}

function Notices({ document }: Props) {
  const { t } = useTranslation();
  const can = usePolicy(document);

  function handleMarkVerified() {
    void document.save({ verifiedAt: new Date().toISOString() });
  }

  const freshnessReferenceDate = document.verifiedAt ?? document.publishedAt;

  function permanentlyDeletedDescription() {
    if (!document.permanentlyDeletedAt) {
      return;
    }

    // if the permanently deleted date is in the past, show the current date
    // to avoid showing a negative number of days. The cleanup task will
    // permanently delete the document at the next run.
    const permanentlyDeletedAt =
      new Date(document.permanentlyDeletedAt) < new Date()
        ? new Date().toISOString()
        : document.permanentlyDeletedAt;

    return (
      <Trans>
        This document will be permanently deleted in{" "}
        <Days dateTime={permanentlyDeletedAt} /> unless restored.
      </Trans>
    );
  }

  return (
    <ErrorBoundary>
      {document.archivedAt && !document.deletedAt && (
        <Notice icon={<ArchiveIcon />}>
          {t("Archived by {{userName}}", {
            userName: document.updatedBy?.name ?? t("Unknown"),
          })}
          &nbsp;
          <Time dateTime={document.updatedAt} addSuffix />
        </Notice>
      )}
      {document.deletedAt && (
        <Notice
          icon={<TrashIcon />}
          description={permanentlyDeletedDescription()}
        >
          {t("Deleted by {{userName}}", {
            userName: document.updatedBy?.name ?? t("Unknown"),
          })}
          &nbsp;
          <Time dateTime={document.deletedAt} addSuffix />
        </Notice>
      )}
      {!document.archivedAt && !document.deletedAt && document.isStale && (
        <FreshnessBanner role="status">
          <span>
            {t("This document may be out of date.")}{" "}
            {freshnessReferenceDate && (
              <>
                {document.verifiedAt ? t("Last verified") : t("Published")}{" "}
                <Time dateTime={freshnessReferenceDate} addSuffix />
                {"."}
              </>
            )}
          </span>
          {can.update && (
            <FreshnessAction
              type="button"
              disabled={document.isSaving}
              onClick={handleMarkVerified}
            >
              {t("Mark verified")}
            </FreshnessAction>
          )}
        </FreshnessBanner>
      )}
    </ErrorBoundary>
  );
}

const FreshnessBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  margin-block: 0 2em;
  padding: 11px 13px;
  border: 1px solid ${s("staleBorder")};
  border-radius: 8px;
  background: ${s("staleBackground")};
  color: ${s("staleText")};
  font-size: 13px;
  line-height: 1.45;
`;

const FreshnessAction = styled.button`
  margin-inline-start: auto;
  flex: 0 0 auto;
  padding: 4px 8px;
  border: 0;
  background: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
`;

export default observer(Notices);
