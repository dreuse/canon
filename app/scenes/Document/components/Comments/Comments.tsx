import { AnimatePresence } from "framer-motion";
import { observer } from "mobx-react";
import { CommentIcon } from "outline-icons";
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouteMatch } from "react-router-dom";
import styled from "styled-components";
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
import useMobile from "~/hooks/useMobile";

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

  useEffect(() => {
    // Handles: 1. on refresh 2. when switching sort setting
    const readyToDisplay = Boolean(document && isEditorInitialized);
    if (
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
          {(!focusedComment || isMobile) && can.comment && !viewingResolved && (
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
          <div style={isMobile ? { padding: "0 8px" } : undefined}>
            {t("Comments")}
          </div>
        </Flex>
      }
      onClose={() => {
        ui.setRightSidebar(null, pane);
        setFocusedCommentId(null);
      }}
      scrollable={false}
    >
      <Filters align="center" justify="space-between" gap={8}>
        <Segmented role="group">
          <Segment
            $active={!viewingResolved}
            onClick={() => setViewingResolved(false)}
            aria-pressed={!viewingResolved}
          >
            {t("Open")} <Count>{openThreads.length}</Count>
          </Segment>
          <Segment
            $active={viewingResolved}
            onClick={() => setViewingResolved(true)}
            aria-pressed={viewingResolved}
          >
            {t("Resolved")} <Count>{resolvedThreads.length}</Count>
          </Segment>
        </Segmented>
        <CommentSortMenu />
      </Filters>
      {content}
    </TintedSidebar>
  );
}

const TintedSidebar = styled(Sidebar)`
  background: ${s("commentsBackground")};
`;

const Filters = styled(Flex)`
  flex-shrink: 0;
  padding: 0 12px 10px;
`;

const Segmented = styled(Flex)`
  flex-shrink: 0;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: ${s("sidebarHoverBackground")};
`;

const Count = styled.span`
  font-variant-numeric: tabular-nums;
`;

const Segment = styled.button<{ $active: boolean }>`
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
