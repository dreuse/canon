import { AnimatePresence } from "framer-motion";
import { observer } from "mobx-react";
import { CommentIcon } from "outline-icons";
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouteMatch } from "react-router-dom";
import styled, { css } from "styled-components";
import { s, hover } from "@shared/styles";
import type { ProsemirrorData } from "@shared/types";
import { UserPreference } from "@shared/types";
import ButtonSmall from "~/components/ButtonSmall";
import { useDocumentContext } from "~/components/DocumentContext";
import Empty from "~/components/Empty";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import { ArrowDownIcon } from "~/components/Icons/ArrowIcon";
import { useSplitView } from "~/components/SplitView/context";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useFocusedComment } from "~/hooks/useFocusedComment";
import useKeyDown from "~/hooks/useKeyDown";
import usePersistedState from "~/hooks/usePersistedState";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import type { CommentSortOption } from "~/types";
import { CommentSortType } from "~/types";
import CommentForm from "./CommentForm";
import CommentSortMenu from "./CommentSortMenu";
import CommentThread from "./CommentThread";
import Sidebar from "../SidebarLayout";
import useMediaQuery from "~/hooks/useMediaQuery";
import useMobile from "~/hooks/useMobile";
import { breakpoints } from "@shared/styles";

function Comments() {
  const { ui, comments, documents } = useStores();
  const { pane } = useSplitView();
  const user = useCurrentUser();
  const { editor, isEditorInitialized, setFocusedCommentId } =
    useDocumentContext();
  const { t } = useTranslation();
  const match = useRouteMatch<{ documentSlug: string }>();
  const document = documents.get(match.params.documentSlug);
  const focusedComment = useFocusedComment();
  const can = usePolicy(document);
  const isMobile = useMobile();
  const isOverlay = !useMediaQuery(`(min-width: ${breakpoints.desktop}px)`);

  const query = useQuery();
  const [viewingResolved, setViewingResolved] = useState(
    query.get("resolved") !== null || focusedComment?.isResolved || false
  );
  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const prevThreadCount = useRef(0);
  const isAtBottom = useRef(true);
  const [showJumpToRecentBtn, setShowJumpToRecentBtn] = useState(false);

  useKeyDown("Escape", () => document && ui.setRightSidebar(null, pane));

  // Account for the resolved status of the comment changing
  useEffect(() => {
    if (focusedComment && focusedComment.isResolved !== viewingResolved) {
      setViewingResolved(focusedComment.isResolved);
    }
  }, [focusedComment, viewingResolved]);

  const [draft, onSaveDraft] = usePersistedState<ProsemirrorData | undefined>(
    `draft-${document?.id}-new`,
    undefined
  );

  const sortOption: CommentSortOption = user.getPreference(
    UserPreference.SortCommentsByOrderInDocument
  )
    ? {
        type: CommentSortType.OrderInDocument,
        referencedCommentIds: editor?.getComments().map((c) => c.id) ?? [],
      }
    : { type: CommentSortType.MostRecent };

  const openThreads = document
    ? comments.unresolvedThreadsInDocument(document.id, sortOption)
    : [];
  const resolvedThreads = document
    ? comments.resolvedThreadsInDocument(document.id, sortOption)
    : [];
  const openCount = document
    ? comments.unresolvedThreadsInDocumentCount(document.id)
    : 0;
  const resolvedCount = document
    ? comments.resolvedThreadsInDocumentCount(document.id)
    : 0;
  const threads = viewingResolved ? resolvedThreads : openThreads;
  const hasComments = threads.length > 0;

  const scrollToBottom = () => {
    if (scrollableRef.current) {
      scrollableRef.current.scrollTo({
        top: scrollableRef.current.scrollHeight,
      });
    }
  };

  const handleScroll = () => {
    const BUFFER_PX = 50;

    if (scrollableRef.current) {
      const sh = scrollableRef.current.scrollHeight;
      const st = scrollableRef.current.scrollTop;
      const ch = scrollableRef.current.clientHeight;
      isAtBottom.current = Math.abs(sh - (st + ch)) <= BUFFER_PX;

      if (isAtBottom.current) {
        setShowJumpToRecentBtn(false);
      }
    }
  };

  // Scroll to the bottom on first display and when the sort or resolved filter
  // changes. The key skips the re-run that happens when a hidden panel becomes
  // visible again, so that the scroll position is kept.
  const scrollKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const readyToDisplay = Boolean(document && isEditorInitialized);
    const key = `${document?.id}:${readyToDisplay}:${sortOption.type}:${viewingResolved}`;
    const changed = scrollKeyRef.current !== key;
    scrollKeyRef.current = key;
    if (
      changed &&
      readyToDisplay &&
      sortOption.type === CommentSortType.MostRecent &&
      !viewingResolved
    ) {
      scrollToBottom();
    }
  }, [sortOption.type, document, isEditorInitialized, viewingResolved]);

  useEffect(() => {
    setShowJumpToRecentBtn(false);
    if (sortOption.type === CommentSortType.MostRecent && !viewingResolved) {
      const commentsAdded = threads.length > prevThreadCount.current;
      if (commentsAdded) {
        if (isAtBottom.current) {
          scrollToBottom(); // Remain pinned to bottom on new comments
        } else {
          setShowJumpToRecentBtn(true);
        }
      }
    }
    prevThreadCount.current = threads.length;
  }, [sortOption.type, threads.length, viewingResolved]);

  const content =
    !document || !isEditorInitialized ? null : (
      <>
        <Scrollable
          id="comments"
          bottomShadow={!focusedComment}
          hiddenScrollbars
          topShadow
          ref={scrollableRef}
          onScroll={handleScroll}
        >
          <Wrapper $hasComments={hasComments}>
            {hasComments ? (
              threads.map((thread) => (
                <CommentThread
                  key={thread.id}
                  comment={thread}
                  document={document}
                  recessed={!!focusedComment && focusedComment.id !== thread.id}
                  focused={focusedComment?.id === thread.id}
                />
              ))
            ) : (
              <NoComments align="center" justify="center" auto>
                <EmptyState align="center" gap={8} column>
                  <EmptyIcon>
                    <CommentIcon size={24} />
                  </EmptyIcon>
                  <EmptyTitle>
                    {viewingResolved
                      ? t("No resolved comments")
                      : t("No comments yet")}
                  </EmptyTitle>
                  {!viewingResolved && (
                    <EmptyHint>
                      {t(
                        "Select any text in the document to start a thread, or leave a general note below."
                      )}
                    </EmptyHint>
                  )}
                </EmptyState>
              </NoComments>
            )}
            {showJumpToRecentBtn && (
              <Fade>
                <JumpToRecent onClick={scrollToBottom}>
                  <Flex align="center">
                    {t("New comments")}&nbsp;
                    <ArrowDownIcon size={20} />
                  </Flex>
                </JumpToRecent>
              </Fade>
            )}
          </Wrapper>
        </Scrollable>
        <AnimatePresence initial={false}>
          {(!focusedComment || isOverlay) &&
            can.comment &&
            !viewingResolved && (
              <NewCommentForm
                draft={draft}
                onSaveDraft={onSaveDraft}
                documentId={document.id}
                placeholder={`${t("Add a comment")}…`}
                autoFocus={false}
                animatePresence
                standalone
              />
            )}
        </AnimatePresence>
      </>
    );

  return (
    <TintedSidebar
      title={
        <Flex align="center" justify="space-between" gap={8} auto>
          <div>{isOverlay ? t("Conversations") : t("Comments")}</div>
        </Flex>
      }
      onClose={() => {
        ui.setRightSidebar(null, pane);
        setFocusedCommentId(null);
      }}
      closeLabel={t("Close conversations")}
      scrollable={false}
    >
      <Filters align="center" justify="space-between" gap={8}>
        <Segmented role={isOverlay ? "tablist" : "group"} $tabs={isOverlay}>
          <Segment
            $active={!viewingResolved}
            $tabs={isOverlay}
            onClick={() => setViewingResolved(false)}
            {...segmentSemantics(isOverlay, !viewingResolved)}
          >
            {isOverlay ? t("Open threads") : t("Open comments")}{" "}
            <Count>{openCount}</Count>
          </Segment>
          <Segment
            $active={viewingResolved}
            $tabs={isOverlay}
            onClick={() => setViewingResolved(true)}
            {...segmentSemantics(isOverlay, viewingResolved)}
          >
            {isOverlay ? t("Resolved threads") : t("Resolved")}{" "}
            <Count>{resolvedCount}</Count>
          </Segment>
        </Segmented>
        {!isMobile && <CommentSortMenu />}
      </Filters>
      {content}
    </TintedSidebar>
  );
}

const TAB_MIN_HEIGHT = 44;

function segmentSemantics(isTab: boolean, active: boolean) {
  return isTab
    ? { role: "tab", "aria-selected": active }
    : { "aria-pressed": active };
}

const TintedSidebar = styled(Sidebar)`
  background: ${s("commentsBackground")};
`;

const Filters = styled(Flex)`
  flex-shrink: 0;
  padding: 0 12px 10px;
`;

const Segmented = styled(Flex)<{ $tabs: boolean }>`
  flex-shrink: 0;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: ${s("sidebarHoverBackground")};

  ${(props) =>
    props.$tabs &&
    css`
      gap: 16px;
      padding: 0;
      border-radius: 0;
      background: transparent;
    `}
`;

const Count = styled.span`
  font-variant-numeric: tabular-nums;
`;

const Segment = styled.button<{ $active: boolean; $tabs: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: var(--pointer);
  background: ${(props) =>
    props.$active ? props.theme.commentCardBackground : "transparent"};
  border: 1px solid
    ${(props) => (props.$active ? props.theme.divider : "transparent")};
  color: ${(props) =>
    props.$active ? props.theme.text : props.theme.textTertiaryOnTint};

  ${Count} {
    opacity: ${(props) => (props.$active ? 0.65 : 1)};
  }

  &: ${hover} {
    color: ${s("text")};
  }

  ${(props) =>
    props.$tabs &&
    css`
      min-height: ${TAB_MIN_HEIGHT}px;
      padding: 0;
      border: 0;
      border-bottom: 2px solid
        ${props.$active ? props.theme.accent : "transparent"};
      border-radius: 0;
      background: transparent;
      font-size: 15px;
    `}
`;

const NoComments = styled(Flex)`
  padding: 0 32px 65px;
  height: 100%;
`;

const EmptyState = styled(Flex)`
  text-align: center;
`;

const EmptyIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: 4px;
  border-radius: 10px;
  background: ${s("commentCardBackground")};
  border: 1px solid ${s("divider")};
  color: ${s("textTertiary")};
`;

const EmptyTitle = styled(Empty)`
  font-size: 15px;
  font-weight: 500;
  color: ${s("text")};
`;

const EmptyHint = styled(Empty)`
  font-size: 13px;
  line-height: 1.5;
`;

const Wrapper = styled.div<{ $hasComments: boolean }>`
  height: ${(props) => (props.$hasComments ? "auto" : "100%")};
  padding-bottom: 12px;
`;

const JumpToRecent = styled(ButtonSmall)`
  position: sticky;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0.8;
  border-radius: 12px;
  padding: 0 4px;

  &:hover {
    opacity: 1;
  }
`;

const NewCommentForm = styled(CommentForm)`
  flex-shrink: 0;
  padding: 10px 18px 12px 12px;
  border-top: 1px solid ${s("divider")};
`;

export default observer(Comments);
