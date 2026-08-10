import { noop } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import DocumentsLoader from "~/components/DocumentsLoader";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import useCollectionDocuments from "../hooks/useCollectionDocuments";
import { useDropToChangeCollection } from "../hooks/useDragAndDrop";
import {
  SEE_ALL_THRESHOLD,
  useTruncatedNodes,
} from "../hooks/useTruncatedNodes";
import SidebarExpansionContext, {
  useSidebarExpansionState,
} from "./SidebarExpansionContext";
import DocumentLink from "./DocumentLink";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import PlaceholderCollections from "./PlaceholderCollections";
import { useSidebarDisclosure } from "./SidebarDisclosureContext";
import SidebarLink from "./SidebarLink";

type Props = {
  /** The collection to render the children of. */
  collection: Collection;
  /** Whether the children are shown in an expanded state. */
  expanded: boolean;
  /** Indentation depth of the parent collection. */
  depth?: number;
  /** Function to prefetch a document by ID. */
  prefetchDocument?: (documentId: string) => Promise<Document | void>;
  /** Element to display above the child documents */
  children?: React.ReactNode;
};

function CollectionLinkChildren({
  collection,
  expanded,
  depth = 0,
  prefetchDocument,
  children,
}: Props) {
  // Documents sit one level below the collection, with a minimum that leaves
  // room for their own disclosure to the left of the label.
  const childDepth = Math.max(depth + 1, 2);
  const { documents, ui } = useStores();
  const { t } = useTranslation();
  const activeDocument = documents.active;
  const childDocuments = useCollectionDocuments(collection, activeDocument);
  const { visible, remaining, showMore } = useTruncatedNodes(
    childDocuments,
    expanded
  );
  const total = childDocuments?.length ?? 0;
  const seeAll = total > SEE_ALL_THRESHOLD;

  const expansion = useSidebarExpansionState(
    childDocuments,
    ui.activeDocumentId
  );

  // Handle collection-level alt-click cascade from DraggableCollectionLink
  const handleCascadeExpand = useCallback(() => {
    if (childDocuments) {
      expansion.expandAll(childDocuments);
    }
  }, [expansion, childDocuments]);

  const handleCascadeCollapse = useCallback(() => {
    expansion.collapseAll();
  }, [expansion]);

  useSidebarDisclosure(handleCascadeExpand, handleCascadeCollapse);

  return (
    <SidebarExpansionContext.Provider value={expansion}>
      <Folder expanded={expanded} depth={childDepth}>
        <DynamicDropCursor collection={collection} />
        <DocumentsLoader collection={collection} enabled={expanded}>
          {children}
          {!childDocuments && (
            <ResizingHeightContainer hideOverflow>
              <Loading />
            </ResizingHeightContainer>
          )}
          {visible?.map((node, index) => (
            <DocumentLink
              key={node.id}
              node={node}
              collection={collection}
              activeDocument={activeDocument}
              prefetchDocument={prefetchDocument}
              isDraft={node.isDraft}
              depth={childDepth}
              index={index}
            />
          ))}
          {childDocuments?.length === 0 && !children && (
            <SidebarLink
              label={
                <Text type="tertiary" size="small" italic>
                  {t("Empty")}
                </Text>
              }
              onClick={() => history.push(collection.url)}
              depth={childDepth}
            />
          )}
          {remaining > 0 && (
            <SidebarLink
              label={
                <Text type="tertiary" size="small">
                  {seeAll
                    ? t(`See all {{ total }}`, { total })
                    : t(`{{ remaining }} more`, {
                        remaining,
                        count: remaining,
                      })}
                </Text>
              }
              to={seeAll ? collection.url : undefined}
              onClick={seeAll ? undefined : showMore}
              depth={childDepth}
            />
          )}
        </DocumentsLoader>
      </Folder>
    </SidebarExpansionContext.Provider>
  );
}

const DynamicDropCursor = observer(
  ({ collection }: { collection: Collection }) => {
    const dummyRef = useRef<HTMLDivElement>(null);
    const [{ isOver, canDrop }] = useDropToChangeCollection(
      collection,
      noop,
      dummyRef
    );

    if (!canDrop || !collection.isManualSort) {
      return null;
    }

    return (
      <DropCursor isActiveDrop={isOver} innerRef={dummyRef} position="top" />
    );
  }
);

const Loading = styled(PlaceholderCollections)`
  margin-inline-start: 44px;
  min-height: 90px;
`;

export default observer(CollectionLinkChildren);
