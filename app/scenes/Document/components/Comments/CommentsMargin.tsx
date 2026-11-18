import { isEqual } from "es-toolkit/compat";
import { observer } from "mobx-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import styled, { createGlobalStyle } from "styled-components";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import type { ProsemirrorData } from "@shared/types";
import type Document from "~/models/Document";
import { useDocumentContext } from "~/components/DocumentContext";
import { layoutMarginCards } from "~/editor/components/marginLayout";
import { useFocusedComment } from "~/hooks/useFocusedComment";
import useKeyDown from "~/hooks/useKeyDown";
import usePersistedState from "~/hooks/usePersistedState";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { useSplitView } from "~/components/SplitView/context";
import { CommentSortType } from "~/types";
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

const COMMENTS_MARGIN_WIDTH = 300;
const COMMENTS_MARGIN_OFFSET = 40;
const FORM_ID = "new-comment-form";

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
  const { editor, isEditorInitialized } = useDocumentContext();
  const focusedComment = useFocusedComment();
  const can = usePolicy(document);
  const columnRef = useRef<HTMLElement>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const formRef = useRef<HTMLDivElement>(null);
  const [tops, setTops] = useState<Record<string, number>>({});
  const [draft, onSaveDraft] = usePersistedState<ProsemirrorData | undefined>(
    `draft-${document.id}-new`,
    undefined
  );
  const threads = comments.unresolvedThreadsInDocument(document.id, {
    type: CommentSortType.OrderInDocument,
    referencedCommentIds: editor?.getComments().map((c) => c.id) ?? [],
  });
  const threadKey = threads.map((thread) => thread.id).join();

  useKeyDown("Escape", () => ui.setRightSidebar(null, pane));

  const measure = useCallback(() => {
    const column = columnRef.current;
    if (!column || !isEditorInitialized) {
      return;
    }

    const columnTop = column.getBoundingClientRect().top;
    const cards = [...cardRefs.current].map(([id, card]) => {
      const anchor = findAnchorElement(id);
      return {
        id,
        anchorTop: anchor
          ? anchor.getBoundingClientRect().top - columnTop
          : null,
        height: card.offsetHeight,
      };
    });
    if (formRef.current) {
      cards.push({
        id: FORM_ID,
        anchorTop: null,
        height: formRef.current.offsetHeight,
      });
    }
    const cardTops = layoutMarginCards(cards);
    const next = Object.fromEntries(
      cards.map(({ id }, index) => [id, cardTops[index]])
    );

    setTops((previous) => (isEqual(previous, next) ? previous : next));
  }, [isEditorInitialized]);

  useLayoutEffect(measure, [
    measure,
    threadKey,
    isEditorInitialized,
    can.comment,
  ]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(measure);
    const main = window.document.querySelector(MAIN_CONTENT_SELECTOR);
    if (main) {
      resizeObserver.observe(main);
    }
    cardRefs.current.forEach((card) => resizeObserver.observe(card));
    if (formRef.current) {
      resizeObserver.observe(formRef.current);
    }
    window.addEventListener("resize", measure);

    let frame = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const mutationObserver = new MutationObserver(scheduleMeasure);
    if (editor?.view.dom) {
      mutationObserver.observe(editor.view.dom, EDITOR_MUTATION_OPTIONS);
    }

    return () => {
      cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, threadKey, editor, isEditorInitialized, can.comment]);

  return (
    <Column
      ref={columnRef}
      aria-label={t("Comments")}
      data-testid="comments-margin"
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
          style={{
            top: tops[thread.id] ?? 0,
            visibility: thread.id in tops ? undefined : "hidden",
          }}
        >
          <CommentThread
            comment={thread}
            document={document}
            recessed={!!focusedComment && focusedComment.id !== thread.id}
            focused={focusedComment?.id === thread.id}
          />
        </Card>
      ))}
      {can.comment && isEditorInitialized && (
        <FormCard
          ref={formRef}
          data-margin-form
          style={{
            top: tops[FORM_ID] ?? 0,
            visibility: FORM_ID in tops ? undefined : "hidden",
          }}
        >
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
    </Column>
  );
});

const HideGutterIndicators = createGlobalStyle`
  .${EditorStyleHelper.commentGutter} {
    display: none !important;
  }
`;

const Column = styled.aside`
  position: relative;
  flex-shrink: 0;
  width: ${COMMENTS_MARGIN_WIDTH}px;
  margin-inline-start: ${COMMENTS_MARGIN_OFFSET}px;
`;

const Card = styled.div`
  position: absolute;
  inset-inline: 0;
`;

const FormCard = styled(Card)`
  padding: 10px 18px 12px 12px;
`;
