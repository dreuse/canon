import type { LocationDescriptor } from "history";
import { observer } from "mobx-react";
import { CommentIcon } from "outline-icons";
import { useRef, Fragment, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { textSizeStyles } from "@shared/components/Text";
import type Document from "~/models/Document";
import type Revision from "~/models/Revision";
import type Template from "~/models/Template";
import {
  Insights,
  openDocumentInsights,
} from "~/actions/definitions/documents";
import { Avatar, AvatarSize } from "~/components/Avatar";
import DocumentMeta from "~/components/DocumentMeta";
import {
  MetaButton,
  Separator,
  headerMetaStyles,
} from "~/components/HeaderMeta";
import Fade from "~/components/Fade";
import { useSplitView } from "~/components/SplitView/context";
import Time from "~/components/Time";
import useClickIntent from "~/hooks/useClickIntent";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useMobile from "~/hooks/useMobile";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { documentPath } from "~/utils/routeHelpers";
import { DocumentComments, DocumentHistory } from "../hooks/useDocumentSidebar";
import { VerifiedBadge } from "./VerifiedBadge";

type Props = {
  /* The document to display meta data for */
  document: Document | Template;
  revision?: Revision;
  to?: LocationDescriptor;
  rtl?: boolean;
};

function TitleDocumentMeta({ to, document, revision, rtl, ...rest }: Props) {
  const { views, comments, ui } = useStores();
  const { t } = useTranslation();
  const isPhone = useMobile();
  const history = useHistory();
  const { pane } = useSplitView();
  const sidebarContext = useLocationSidebarContext();
  const team = useCurrentTeam();
  const documentViews = views.inDocument(document.id);
  const totalViewers = documentViews.length;
  const onlyYou = totalViewers === 1 && documentViews[0].userId;
  const contributorCount = (document as Document).collaboratorIds?.length ?? 0;
  const viewsLoadedOnMount = useRef(totalViewers > 0);
  const can = usePolicy(document);

  const Wrapper = viewsLoadedOnMount.current ? Fragment : Fade;

  const commentsCount = comments.unresolvedThreadsInDocumentCount(document.id);
  const commentingEnabled = team.commentingEnabled;
  const commentsOpen = ui.getRightSidebar(pane) === "comments";

  const {
    ref: commentsRef,
    handleMouseEnter: handleCommentsMouseEnter,
    handleMouseLeave: handleCommentsMouseLeave,
  } = useClickIntent(DocumentComments.preload, {
    predict: true,
  });
  const {
    ref: insightsRef,
    handleMouseEnter: handleInsightsMouseEnter,
    handleMouseLeave: handleInsightsMouseLeave,
  } = useClickIntent(Insights.preload, { predict: true });

  const handleClickMeta = useCallback(() => {
    if (to) {
      history.replace(to);
    }
  }, [history, to]);

  const handleClickComment = useCallback(() => {
    history.push({
      pathname: documentPath(document as Document),
      state: { sidebarContext },
    });
    ui.setRightSidebar(commentsOpen ? null : "comments", pane);
  }, [history, document, sidebarContext, ui, pane, commentsOpen]);

  if (isPhone) {
    return <PhoneMeta document={document as Document} revision={revision} />;
  }

  return (
    <Meta
      document={document as Document}
      revision={revision}
      showOwner={!revision}
      onClick={to ? handleClickMeta : undefined}
      onClickIntent={to ? DocumentHistory.preload : undefined}
      $rtl={rtl}
      {...rest}
    >
      {commentingEnabled && can.comment && (
        <>
          <Separator />
          <MetaButton
            ref={commentsRef}
            onClick={handleClickComment}
            onMouseEnter={handleCommentsMouseEnter}
            onMouseLeave={handleCommentsMouseLeave}
            aria-expanded={commentsOpen}
          >
            <CommentIcon size={18} />
            {commentsCount
              ? t("{{ count }} conversation", { count: commentsCount })
              : t("Comment")}
          </MetaButton>
        </>
      )}
      {contributorCount > 1 && (
        <Wrapper>
          <Separator />
          <MetaButton action={openDocumentInsights}>
            {t("{{ count }} contributor", { count: contributorCount })}
          </MetaButton>
        </Wrapper>
      )}
      {totalViewers &&
      !onlyYou &&
      can.listViews &&
      !(document as Document).isDraft ? (
        <Wrapper>
          <Separator />
          <MetaButton
            ref={insightsRef}
            action={openDocumentInsights}
            onMouseEnter={handleInsightsMouseEnter}
            onMouseLeave={handleInsightsMouseLeave}
          >
            {t("Viewed by")}{" "}
            {`${totalViewers} ${
              totalViewers === 1 ? t("person") : t("people")
            }`}
          </MetaButton>
        </Wrapper>
      ) : null}
    </Meta>
  );
}

const PhoneMeta = observer(function PhoneMeta({
  document,
  revision,
}: {
  document: Document;
  revision?: Revision;
}) {
  const person = revision
    ? revision.createdBy
    : document.deletedAt
      ? document.deletedBy
      : document.updatedBy;
  const date =
    revision?.createdAt ??
    document.deletedAt ??
    document.archivedAt ??
    document.updatedAt;

  return (
    <PhoneContainer data-document-meta>
      {person && <Avatar model={person} size={AvatarSize.Toast} />}
      {person && <PersonName>{person.name}</PersonName>}
      <Time dateTime={date} addSuffix />
      <VerifiedBadge document={document} compact />
    </PhoneContainer>
  );
});

const PhoneContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  margin: 0 0 24px;
  color: ${s("textTertiary")};
  ${textSizeStyles("small")}

  @media print {
    display: none;
  }
`;

const PersonName = styled.span`
  color: ${s("textSecondary")};
`;

export const Meta = styled(DocumentMeta)<{ $rtl?: boolean }>`
  ${headerMetaStyles}
`;

export default observer(TitleDocumentMeta);
