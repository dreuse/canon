import { m } from "framer-motion";
import { observer } from "mobx-react";
import { DoneIcon } from "outline-icons";
import { transparentize } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import scrollIntoView from "scroll-into-view-if-needed";
import styled, { css } from "styled-components";
import EventBoundary from "@shared/components/EventBoundary";
import { s, hover } from "@shared/styles";
import type { ProsemirrorData } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import type Comment from "~/models/Comment";
import type Document from "~/models/Document";
import { AvatarSize } from "~/components/Avatar";
import { useDocumentContext } from "~/components/DocumentContext";
import Facepile from "~/components/Facepile";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import ReactionPicker from "~/components/Reactions/ReactionPicker";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Tooltip from "~/components/Tooltip";
import { resolveCommentActionFactory } from "~/actions/definitions/comments";
import CommentMenu from "~/menus/CommentMenu";
import useBoolean from "~/hooks/useBoolean";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import usePersistedState from "~/hooks/usePersistedState";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import useCurrentUser from "~/hooks/useCurrentUser";
import { sidebarAppearDuration } from "~/styles/animations";
import CommentForm from "./CommentForm";
import CommentThreadItem from "./CommentThreadItem";
import { HighlightedText } from "./HighlightText";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";

type Props = {
  /** The document that this comment thread belongs to */
  document: Document;
  /** The root comment to render */
  comment: Comment;
  /** Whether the thread is focused */
  focused: boolean;
  /** Whether the thread is displayed in a recessed/backgrounded state */
  recessed: boolean;
  /** Number of replies before collapsing */
  collapseThreshold?: number;
  /** Number of replies to display when collapsed */
  collapseNumDisplayed?: number;
};

function CommentThread({
  comment: thread,
  document,
  recessed,
  focused,
  collapseThreshold = 5,
  collapseNumDisplayed = 3,
}: Props) {
  const [scrollOnMount] = React.useState(focused && !window.location.hash);
  // Whether to play the entrance animation, captured once at mount so that
  // submitting the thread (which flips isNew) does not change the animation.
  const [animateIn] = React.useState(thread.isNew);
  const { editor, setFocusedCommentId } = useDocumentContext();
  const { comments } = useStores();
  const topRef = React.useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const [autoFocus, setAutoFocusOn, setAutoFocusOff] = useBoolean(thread.isNew);
  const user = useCurrentUser();

  const can = usePolicy(document);

  const [draft, onSaveDraft] = usePersistedState<ProsemirrorData | undefined>(
    `draft-${document.id}-${thread.id}`,
    undefined
  );

  // Track edit states for all comments in the thread
  const [editingCommentIds, setEditingCommentIds] = React.useState<Set<string>>(
    new Set()
  );

  const canReply = can.comment && !thread.isResolved;

  const highlightedText =
    ProsemirrorHelper.getAnchorTextForComment(
      editor?.getComments() ?? [],
      thread.id
    ) ?? thread.pendingAnchor?.anchorText;

  const commentsInThread = comments
    .inThread(thread.id)
    .filter((comment) => !comment.isNew);

  const [collapse, setCollapse] = React.useState(() => {
    const numReplies = commentsInThread.length - 1;
    if (numReplies >= collapseThreshold) {
      return {
        begin: 1,
        final: commentsInThread.length - collapseNumDisplayed - 1,
      };
    }
    return null;
  });

  useOnClickOutside(topRef, (event) => {
    const target = event.target as HTMLElement;
    if (
      focused &&
      !target.classList.contains("comment") &&
      // Clicking another thread switches focus to it directly via its own
      // click handler, so skip deselecting here to avoid a flash of the
      // deselected state (and the new comment form) in between.
      !target.closest("[data-comment-thread]") &&
      !target.closest("." + EditorStyleHelper.commentGutter) &&
      event.defaultPrevented === false
    ) {
      setFocusedCommentId(null);
    }
  });

  const handleSubmit = React.useCallback(() => {
    editor?.updateComment(thread.id, { draft: false });
  }, [editor, thread.id]);

  const handleClickThread = () => {
    setFocusedCommentId(thread.id);
  };

  const handleThreadUpdate = React.useCallback(
    (attrs: { resolved: boolean }) => {
      editor?.updateComment(thread.id, attrs);
      setFocusedCommentId(null);
    },
    [editor, thread.id, setFocusedCommentId]
  );

  const handleAddReaction = React.useCallback(
    async (emoji: string) => {
      await thread.addReaction({ emoji, user });
    },
    [thread, user]
  );

  const handleClickExpand = (ev: React.SyntheticEvent) => {
    ev.stopPropagation();
    setCollapse(null);
  };

  const handleUpArrowAtStart = React.useCallback(() => {
    // Find the previous comment by the current user in reverse order
    const userComments = commentsInThread
      .filter((comment) => comment.createdById === user.id)
      .reverse(); // Start from most recent

    if (userComments.length > 0) {
      const previousComment = userComments[0];
      setEditingCommentIds((prev) => new Set(prev).add(previousComment.id));
    }
  }, [commentsInThread, user.id]);

  const handleCommentEditStart = React.useCallback((commentId: string) => {
    setEditingCommentIds((prev) => new Set(prev).add(commentId));
  }, []);

  const handleCommentEditEnd = React.useCallback((commentId: string) => {
    setEditingCommentIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(commentId);
      return newSet;
    });
  }, []);

  const renderShowMore = (collapse: { begin: number; final: number }) => {
    const count = collapse.final - collapse.begin + 1;
    const createdBy = commentsInThread
      .slice(collapse.begin, collapse.final + 1)
      .map((c) => c.createdBy);
    const users = Array.from(new Set(createdBy));
    const limit = 3;
    const overflow = users.length - limit;

    return (
      <ShowMore onClick={handleClickExpand} key="show-more">
        {t("Show {{ count }} reply", { count })}
        <Facepile
          users={users}
          limit={limit}
          overflow={overflow}
          size={AvatarSize.Medium}
        />
      </ShowMore>
    );
  };

  React.useEffect(() => {
    if (!focused && autoFocus) {
      setAutoFocusOff();
    }
  }, [focused, autoFocus, setAutoFocusOff]);

  React.useEffect(() => {
    if (focused) {
      if (scrollOnMount) {
        setTimeout(() => {
          if (!topRef.current) {
            return;
          }
          scrollIntoView(topRef.current, {
            scrollMode: "if-needed",
            behavior: "auto",
            block: "nearest",
            boundary: (parent) =>
              // Prevents body and other parent elements from being scrolled
              parent.id !== "comments",
          });
        }, sidebarAppearDuration);
      } else {
        setTimeout(() => {
          if (!topRef.current) {
            return;
          }
          // Scroll the whole into view when its mark is clicked
          scrollIntoView(topRef.current, {
            scrollMode: "if-needed",
            behavior: "smooth",
            block: "nearest",
            boundary: (parent) =>
              // Prevents body and other parent elements from being scrolled
              parent.id !== "comments",
          });
        }, 0);
      }

      const getCommentMarkElement = () =>
        window.document?.getElementById(`comment-${thread.id}`);
      const isMarkVisible = !!getCommentMarkElement();

      setTimeout(
        () => {
          getCommentMarkElement()?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        },
        isMarkVisible ? 0 : sidebarAppearDuration
      );
    }
  }, [focused, scrollOnMount, thread.id]);

  return (
    <Thread
      ref={topRef}
      data-comment-thread
      layout="position"
      transition={{ layout: { duration: 0.2, ease: "easeOut" } }}
      $focused={focused}
      $recessed={recessed}
      onClick={handleClickThread}
    >
      {/* The entrance transform lives on an inner element so it does not
          conflict with the layout projection transform on Thread, which
          would otherwise skew the thread during layout animations. */}
      {thread.isResolved && (
        <ResolvedBanner align="center" gap={6}>
          <DoneIcon size={18} />
          {thread.resolvedBy
            ? t("Resolved by {{ userName }}", {
                userName: thread.resolvedBy.name,
              })
            : t("Resolved")}
        </ResolvedBanner>
      )}
      {highlightedText && (
        <HighlightedText $expanded={focused}>
          <span>{highlightedText}</span>
        </HighlightedText>
      )}
      <ThreadInner
        initial={animateIn ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {commentsInThread.map((comment, index) => {
          if (collapse !== null) {
            if (index === collapse.begin) {
              return renderShowMore(collapse);
            } else if (index > collapse.begin && index <= collapse.final) {
              return null;
            }
          }

          const firstOfAuthor =
            index === 0 ||
            (collapse && index === collapse.final + 1) ||
            comment.createdById !== commentsInThread[index - 1].createdById;
          const lastOfAuthor =
            index === commentsInThread.length - 1 ||
            comment.createdById !== commentsInThread[index + 1].createdById;

          return (
            <CommentThreadItem
              hideActions={index === 0}
              comment={comment}
              onDelete={editor?.removeComment}
              onUpdate={editor?.updateComment}
              key={comment.id}
              firstOfThread={index === 0}
              lastOfThread={index === commentsInThread.length - 1 && !draft}
              canReply={focused && can.comment}
              firstOfAuthor={firstOfAuthor}
              lastOfAuthor={lastOfAuthor}
              previousCommentCreatedAt={commentsInThread[index - 1]?.createdAt}
              forceEdit={editingCommentIds.has(comment.id)}
              onEditStart={() => handleCommentEditStart(comment.id)}
              onEditEnd={() => handleCommentEditEnd(comment.id)}
            />
          );
        })}

        <ResizingHeightContainer hideOverflow={false}>
          {(focused || draft || commentsInThread.length === 0) && canReply && (
            <Fade timing={100}>
              <CommentForm
                onSubmit={handleSubmit}
                onSaveDraft={onSaveDraft}
                draft={draft}
                documentId={document.id}
                thread={thread}
                standalone={commentsInThread.length === 0}
                autoFocus={autoFocus}
                onUpArrowAtStart={handleUpArrowAtStart}
              />
            </Fade>
          )}
        </ResizingHeightContainer>
      </ThreadInner>
      {!focused && !draft && commentsInThread.length > 0 && (
        <Footer align="center" justify="space-between" gap={8}>
          {canReply ? (
            <Reply onClick={setAutoFocusOn}>{t("Reply")}…</Reply>
          ) : (
            <span />
          )}
          <EventBoundary>
            <Flex gap={2}>
              {!thread.isResolved && (
                <>
                  <Tooltip content={t("Mark as resolved")} placement="top">
                    <ThreadAction
                      as={NudeButton}
                      action={resolveCommentActionFactory({
                        comment: thread,
                        onResolve: () => handleThreadUpdate({ resolved: true }),
                      })}
                    >
                      <DoneIcon size={20} outline />
                    </ThreadAction>
                  </Tooltip>
                  <ThreadAction
                    as={ReactionPicker}
                    onSelect={handleAddReaction}
                  />
                </>
              )}
              <ThreadAction
                as={CommentMenu}
                comment={thread}
                onEdit={() => handleCommentEditStart(thread.id)}
                onDelete={() => editor?.removeComment(thread.id)}
                onUpdate={handleThreadUpdate}
              />
            </Flex>
          </EventBoundary>
        </Footer>
      )}
    </Thread>
  );
}

const Reply = styled.button`
  border: 0;
  padding: 0;
  margin: 0;
  background: none;
  color: ${s("textTertiary")};
  font-size: 14px;
  -webkit-appearance: none;
  cursor: var(--pointer);
  text-align: start;
  flex-grow: 1;

  &: ${hover} {
    color: ${s("textSecondary")};
  }
`;

const Footer = styled(Flex)`
  padding: 6px 8px 6px 14px;
  border-top: 1px solid ${s("divider")};
`;

const ThreadAction = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: ${s("textTertiary")};

  svg {
    fill: currentColor;
  }

  &[aria-expanded="true"],
  &:${hover} {
    background: ${s("sidebarHoverBackground")};
    color: ${s("textSecondary")};
  }
`;

const ResolvedBanner = styled(Flex)`
  padding: 7px 12px;
  background: ${s("sidebarBackground")};
  color: ${s("freshText")};
  font-size: 13px;
  font-weight: 500;

  svg {
    fill: currentColor;
    flex-shrink: 0;
  }
`;

const ShowMore = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-block: 4px;
  margin-inline-start: 32px;
  padding: 6px 10px;
  border-radius: 8px;
  color: ${s("textTertiaryOnTint")};
  background: ${s("sidebarBackground")};
  cursor: var(--pointer);
  font-size: 13px;

  &: ${hover} {
    color: ${s("textSecondary")};
    background: ${s("sidebarHoverBackground")};
  }

  * {
    border-color: ${s("sidebarBackground")};
  }
`;

const Thread = styled(m.div)<{
  $focused: boolean;
  $recessed: boolean;
}>`
  margin-block: 0 10px;
  margin-inline: 12px 18px;
  position: relative;
  background: ${s("commentCardBackground")};
  border: 1px solid ${s("divider")};
  border-radius: 12px;
  overflow: hidden;
  transition:
    opacity 100ms ease-out,
    box-shadow 100ms ease-out;

  ${(props) =>
    props.$focused &&
    css`
      box-shadow: 0 2px 10px ${transparentize(0.94, props.theme.text)};
    `}

  ${(props) =>
    props.$recessed &&
    css`
      opacity: 0.5;
      cursor: default;
    `}
`;

const ThreadInner = styled(m.div)`
  padding: 10px 12px;
`;

export default observer(CommentThread);
