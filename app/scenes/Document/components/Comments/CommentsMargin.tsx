import { type MotionProps, m, useIsPresent } from "framer-motion";
import { observer } from "mobx-react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import styled, { createGlobalStyle } from "styled-components";
import { HEADER_HEIGHT } from "@shared/constants";
import { s } from "@shared/styles";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import type { ProsemirrorData } from "@shared/types";
import type Document from "~/models/Document";
import { useDocumentContext } from "~/components/DocumentContext";
import {
  MARGIN_CARD_GAP,
  layoutMarginCards,
  measureAnchorTop,
} from "~/editor/components/marginLayout";
import { useFocusedComment } from "~/hooks/useFocusedComment";
import useKeyDown from "~/hooks/useKeyDown";
import usePersistedState from "~/hooks/usePersistedState";
import useCommentsLayout from "~/scenes/Document/hooks/useCommentsLayout";
import useMarginTransition from "~/scenes/Document/hooks/useMarginTransition";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { useSplitView } from "~/components/SplitView/context";
import { type CommentSortOption, CommentSortType } from "~/types";
import {
  type CommentsLayout,
  getCentredMarginShift,
} from "~/scenes/Document/components/commentsLayout";
import CommentForm from "./CommentForm";
import CommentThread from "./CommentThread";

const MAIN_CONTENT_SELECTOR = '[role="main"]';
const EDITOR_MUTATION_OPTIONS: MutationObserverInit = {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ["id", "class"],
};

const CARD_FADE_DELAY_SECONDS = 0.2;
const CARDS_MIN_TOP = HEADER_HEIGHT + MARGIN_CARD_GAP;
const MARGIN_WIDTH_PROPERTY = "--comments-margin-width";
const FORM_ID = "new-comment-form";
const LINK_ID = "resolved-link";

interface MeasuredCard {
  id: string;
  element: HTMLElement;
  anchorTop: number | null;
  height: number;
}

function placeCard(element: HTMLElement, top: number, height: number) {
  element.style.top = `${top}px`;
  element.style.visibility = height > 0 ? "visible" : "hidden";
}

function findAnchorElement(threadId: string): Element | null {
  const marker = window.document.getElementById(`comment-${threadId}`);
  if (!marker?.classList.contains(EditorStyleHelper.imagePositionAnchor)) {
    return marker;
  }

  let sibling = marker.nextElementSibling;
  while (
    sibling &&
    !sibling.querySelector(`.${EditorStyleHelper.imageWrapper}`)
  ) {
    sibling = sibling.nextElementSibling;
  }
  return sibling ?? marker;
}

function measureCentredOffset(
  column: HTMLElement,
  text: HTMLElement,
  appliedOffset: number
): number {
  const columnRect = column.getBoundingClientRect();
  const textRect = text.getBoundingClientRect();
  const textStyle = getComputedStyle(text);

  if (getComputedStyle(column).direction === "rtl") {
    return getCentredMarginShift(
      -(textRect.left + parseFloat(textStyle.paddingLeft)),
      -(columnRect.right - appliedOffset)
    );
  }

  return -getCentredMarginShift(
    textRect.right - parseFloat(textStyle.paddingRight),
    columnRect.left - appliedOffset
  );
}

function isSameLayout(a: CommentsLayout, b: CommentsLayout) {
  return (
    a.mode === b.mode &&
    a.marginWidth === b.marginWidth &&
    a.marginOffset === b.marginOffset &&
    a.marginEndGap === b.marginEndGap &&
    a.cardEndGap === b.cardEndGap
  );
}

interface Props {
  /** The document whose open threads are placed in the margin. */
  document: Document;
}

/**
 * Column beside the document text that places each open comment thread level
 * with the text it was made on.
 */
export const CommentsMargin = observer(function CommentsMargin({
  document,
}: Props) {
  const { t } = useTranslation();
  const { ui, comments } = useStores();
  const { pane } = useSplitView();
  const liveLayout = useCommentsLayout();
  const [layout, setLayout] = useState(liveLayout);
  if (liveLayout.mode !== "none" && !isSameLayout(liveLayout, layout)) {
    setLayout(liveLayout);
  }
  const { transition, reducedMotion } = useMarginTransition();
  const marginTotalWidth =
    layout.marginOffset + layout.marginWidth + layout.marginEndGap;
  const cardMotion: MotionProps = {
    initial: reducedMotion ? false : { opacity: 0 },
    animate: { opacity: 1 },
    transition: reducedMotion
      ? transition
      : { ...transition, delay: CARD_FADE_DELAY_SECONDS },
  };
  const { editor, isEditorInitialized, setFocusedCommentId } =
    useDocumentContext();
  const focusedComment = useFocusedComment();
  const can = usePolicy(document);
  const isPresent = useIsPresent();
  const isPresentRef = useRef(isPresent);
  const slotRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLElement>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const formRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLDivElement>(null);
  const shouldFocusFirstCard = useRef(false);
  const [viewingResolved, setViewingResolved] = useState(false);
  const measuredIds = useRef(new Set<string>());
  const appliedOffset = useRef(0);
  const [draft, onSaveDraft] = usePersistedState<ProsemirrorData | undefined>(
    `draft-${document.id}-new`,
    undefined
  );
  const sort: CommentSortOption = {
    type: CommentSortType.OrderInDocument,
    referencedCommentIds: editor?.getComments().map((c) => c.id) ?? [],
  };
  const openThreads = comments.unresolvedThreadsInDocument(document.id, sort);
  const resolvedCount = comments.resolvedThreadsInDocumentCount(document.id);
  const showResolved = viewingResolved && resolvedCount > 0;
  const threads = showResolved
    ? comments.resolvedThreadsInDocument(document.id, sort)
    : openThreads;
  const firstThreadId = threads[0]?.id;
  const isFocusedInList = threads.some(
    (thread) => thread.id === focusedComment?.id
  );
  const threadKey = threads.map((thread) => thread.id).join();

  useEffect(() => {
    if (focusedComment && !focusedComment.isResolved) {
      setViewingResolved(false);
    }
  }, [focusedComment]);

  useEffect(() => {
    if (resolvedCount === 0) {
      setViewingResolved(false);
    }
  }, [resolvedCount]);

  const handleResolveFocused = useCallback(
    (threadId: string) => {
      const orderedThreads = comments
        .threadsInDocument(document.id, {
          type: CommentSortType.OrderInDocument,
          referencedCommentIds: editor?.getComments().map((c) => c.id) ?? [],
        })
        .filter((thread) => thread.id === threadId || !thread.isResolved);
      const index = orderedThreads.findIndex(
        (thread) => thread.id === threadId
      );
      const neighbour = orderedThreads[index + 1] ?? orderedThreads[index - 1];
      setFocusedCommentId(neighbour?.id ?? null);
    },
    [comments, document.id, editor, setFocusedCommentId]
  );

  const handleShowResolved = useCallback(() => {
    shouldFocusFirstCard.current = true;
    setViewingResolved(true);
  }, []);

  const handleShowOpen = useCallback(() => {
    shouldFocusFirstCard.current = true;
    setViewingResolved(false);
  }, []);

  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    threadId: string
  ) => {
    if (event.key === "Enter" && event.target === event.currentTarget) {
      setFocusedCommentId(threadId);
    }
  };

  useEffect(() => {
    if (!firstThreadId) {
      shouldFocusFirstCard.current = false;
      return;
    }
    if (
      !shouldFocusFirstCard.current ||
      !measuredIds.current.has(firstThreadId)
    ) {
      return;
    }
    shouldFocusFirstCard.current = false;
    const card = cardRefs.current.get(firstThreadId);
    card?.focus({ preventScroll: true });
    card?.scrollIntoView({ block: "nearest" });
  }, [threadKey, isEditorInitialized, firstThreadId]);

  useKeyDown("Escape", () => ui.setRightSidebar(null, pane));

  useLayoutEffect(() => {
    isPresentRef.current = isPresent;
  }, [isPresent]);

  const measure = useCallback(() => {
    const column = columnRef.current;
    if (!column || !isEditorInitialized || !isPresentRef.current) {
      return;
    }

    const text = editor?.view.dom;
    const offset =
      layout.mode === "centred" && text
        ? measureCentredOffset(column, text, appliedOffset.current)
        : 0;
    appliedOffset.current = offset;
    if (slotRef.current) {
      slotRef.current.style.transform = offset ? `translateX(${offset}px)` : "";
    }

    const columnTop = column.getBoundingClientRect().top;
    const cards: MeasuredCard[] = [...cardRefs.current].map(([id, card]) => {
      const anchor = findAnchorElement(id);
      const top =
        anchor && text && !showResolved ? measureAnchorTop(anchor, text) : null;
      return {
        id,
        element: card,
        anchorTop: top === null ? null : top - columnTop,
        height: card.offsetHeight,
      };
    });
    if (formRef.current) {
      cards.push({
        id: FORM_ID,
        element: formRef.current,
        anchorTop: null,
        height: formRef.current.offsetHeight,
      });
    }
    if (linkRef.current) {
      cards.push({
        id: LINK_ID,
        element: linkRef.current,
        anchorTop: null,
        height: linkRef.current.offsetHeight,
      });
    }
    const cardTops = layoutMarginCards(cards, MARGIN_CARD_GAP, CARDS_MIN_TOP);

    measuredIds.current.clear();
    cards.forEach(({ id, element, height }, index) => {
      placeCard(element, cardTops[index], height);
      if (height > 0) {
        measuredIds.current.add(id);
      }
    });
  }, [editor, isEditorInitialized, layout.mode, showResolved]);

  useLayoutEffect(measure, [
    measure,
    threadKey,
    resolvedCount,
    isEditorInitialized,
    can.comment,
  ]);

  useLayoutEffect(() => {
    const resizeObserver = new ResizeObserver(measure);
    const main = window.document.querySelector(MAIN_CONTENT_SELECTOR);
    if (main) {
      resizeObserver.observe(main);
    }
    if (editor?.view.dom) {
      resizeObserver.observe(editor.view.dom);
    }
    cardRefs.current.forEach((card) => resizeObserver.observe(card));
    if (formRef.current) {
      resizeObserver.observe(formRef.current);
    }
    if (linkRef.current) {
      resizeObserver.observe(linkRef.current);
    }
    window.addEventListener("resize", measure);

    const mutationObserver = new MutationObserver(measure);
    if (editor?.view.dom) {
      mutationObserver.observe(editor.view.dom, EDITOR_MUTATION_OPTIONS);
    }

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [
    measure,
    threadKey,
    resolvedCount,
    editor,
    isEditorInitialized,
    can.comment,
  ]);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    const host = slot?.parentElement;
    if (!slot || !host) {
      return;
    }
    const publishWidth = () =>
      host.style.setProperty(
        MARGIN_WIDTH_PROPERTY,
        `${slot.getBoundingClientRect().width}px`
      );
    const resizeObserver = new ResizeObserver(publishWidth);
    resizeObserver.observe(slot);
    publishWidth();

    return () => {
      resizeObserver.disconnect();
      host.style.removeProperty(MARGIN_WIDTH_PROPERTY);
    };
  }, []);

  return (
    <Slot
      data-margin-slot
      ref={slotRef}
      initial={reducedMotion ? false : { width: 0, opacity: 0 }}
      animate={{ width: marginTotalWidth, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={transition}
      onAnimationComplete={measure}
    >
      <Column
        ref={columnRef}
        aria-label={t("Comments")}
        data-testid="comments-margin"
        $layout={layout}
      >
        <HideGutterIndicators />
        {threads.map((thread) => (
          <Card
            key={thread.id}
            ref={(element) => {
              if (element) {
                cardRefs.current.set(thread.id, element);
              } else {
                cardRefs.current.delete(thread.id);
              }
            }}
            data-margin-card={thread.id}
            role="article"
            aria-label={thread.createdBy?.name}
            tabIndex={0}
            aria-current={focusedComment?.id === thread.id ? "true" : undefined}
            onKeyDown={(event) => handleCardKeyDown(event, thread.id)}
            {...cardMotion}
          >
            <CommentThread
              comment={thread}
              document={document}
              recessed={isFocusedInList && focusedComment?.id !== thread.id}
              focused={focusedComment?.id === thread.id}
              margin
              onResolveFocused={handleResolveFocused}
            />
          </Card>
        ))}
        {can.comment && isEditorInitialized && !showResolved && (
          <FormCard ref={formRef} data-margin-form {...cardMotion}>
            <CommentForm
              draft={draft}
              onSaveDraft={onSaveDraft}
              documentId={document.id}
              placeholder={`${t("Add a comment")}…`}
              autoFocus={false}
              standalone
            />
          </FormCard>
        )}
        {(showResolved || resolvedCount > 0) && (
          <LinkRow ref={linkRef} {...cardMotion}>
            {showResolved ? (
              <ResolvedLink onClick={handleShowOpen}>
                {t("Back to open threads")}
              </ResolvedLink>
            ) : (
              <ResolvedLink onClick={handleShowResolved}>
                {t("{{ count }} resolved thread", { count: resolvedCount })}
              </ResolvedLink>
            )}
          </LinkRow>
        )}
      </Column>
    </Slot>
  );
});

const HideGutterIndicators = createGlobalStyle`
  .${EditorStyleHelper.commentGutter} {
    display: none !important;
  }
`;

const Slot = styled(m.div)`
  display: flex;
  flex-shrink: 0;
  overflow-x: clip;
`;

const Column = styled.aside<{ $layout: CommentsLayout }>`
  position: relative;
  flex-shrink: 0;
  width: ${(props) => props.$layout.marginWidth}px;
  margin-inline: ${(props) => props.$layout.marginOffset}px
    ${(props) => props.$layout.marginEndGap}px;
  --margin-card-end-gap: ${(props) => props.$layout.cardEndGap}px;
`;

const Card = styled(m.div)`
  position: absolute;
  top: 0;
  visibility: hidden;
  inset-inline: 0 var(--margin-card-end-gap);
  border-radius: 8px;
  scroll-margin-top: ${CARDS_MIN_TOP}px;

  &:focus-visible {
    outline: 2px solid ${s("accent")};
    outline-offset: 2px;
  }
`;

const LinkRow = styled(m.div)`
  position: absolute;
  top: 0;
  visibility: hidden;
  inset-inline: 0;
`;

const ResolvedLink = styled.button`
  border: 0;
  padding: 0;
  background: none;
  color: ${s("textTertiary")};
  font-size: 13px;
  line-height: 18px;
  cursor: var(--pointer);

  &:hover {
    color: ${s("textSecondary")};
  }
`;

const FormCard = styled(Card)`
  padding: 10px 0 12px 12px;
`;
