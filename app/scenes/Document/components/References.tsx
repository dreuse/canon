import { observer } from "mobx-react";
import { useEffect, useRef, Fragment, useMemo, useState } from "react";
import { Trans } from "react-i18next";
import styled from "styled-components";
import { hover, s } from "@shared/styles";
import type Document from "~/models/Document";
import Fade from "~/components/Fade";
import { determineSidebarContext } from "~/components/Sidebar/components/SidebarContext";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import ReferenceListItem from "./ReferenceListItem";
import useShare from "@shared/hooks/useShare";
import type { NavigationNode } from "@shared/types";
import { flattenTree } from "@shared/utils/tree";

type Props = {
  document: Document;
};

type TabType = "children" | "backlinks";

function References({ document }: Props) {
  const { documents } = useStores();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const locationSidebarContext = useLocationSidebarContext();
  const { sharedTree, isShare } = useShare();
  const [activeTab, setActiveTab] = useState<TabType>("children");
  const isJustCreated = useMemo(
    () => document.isJustCreated,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [document.id]
  );

  useEffect(() => {
    if (!isShare && !isJustCreated) {
      void documents.fetchRelationships(document.id);
    }
  }, [isShare, documents, document.id, isJustCreated]);

  const children = useChildren(document, sharedTree);
  const backlinks = useBacklinks(document, sharedTree);
  const showBacklinks = !!backlinks.length;
  const showChildDocuments = !!children.length;
  const shouldFade = useRef(!showBacklinks && !showChildDocuments);
  const isBacklinksTab = activeTab === "backlinks" || !showChildDocuments;
  const Component = shouldFade.current ? Fade : Fragment;

  return showBacklinks || showChildDocuments ? (
    <Component>
      <SectionHeader>
        {showChildDocuments && (
          <SectionTab
            type="button"
            $active={!isBacklinksTab}
            onClick={() => setActiveTab("children")}
          >
            <Trans>Documents</Trans>
          </SectionTab>
        )}
        {showBacklinks && (
          <SectionTab
            type="button"
            $active={isBacklinksTab}
            onClick={() => setActiveTab("backlinks")}
          >
            <Trans>Backlinks</Trans>
          </SectionTab>
        )}
      </SectionHeader>
      <Content>
        {showBacklinks && isBacklinksTab && (
          <List>
            {backlinks.map((node) => {
              // If we have the document in the store already then use it to get the extra
              // contextual info, otherwise the collection node will do (only has title and id)
              const backlinkedDocument = documents.get(node.id);
              return (
                <ReferenceListItem
                  anchor={backlinkedDocument?.urlId}
                  key={node.id}
                  document={backlinkedDocument || node}
                  showCollection={
                    backlinkedDocument?.collectionId !== document.collectionId
                  }
                  sidebarContext={
                    user && backlinkedDocument
                      ? determineSidebarContext({
                          document: backlinkedDocument,
                          user,
                          currentContext: locationSidebarContext,
                        })
                      : undefined
                  }
                />
              );
            })}
          </List>
        )}
        {showChildDocuments && !isBacklinksTab && (
          <List>
            {children.map((node) => {
              // If we have the document in the store already then use it to get the extra
              // contextual info, otherwise the collection node will do (only has title and id)
              const document = documents.get(node.id);
              return (
                <ReferenceListItem
                  key={node.id}
                  document={document || node}
                  showCollection={false}
                  sidebarContext={locationSidebarContext}
                />
              );
            })}
          </List>
        )}
      </Content>
    </Component>
  ) : null;
}

/**
 * Hook to get the children of a document, filtering from the shared tree if available.
 *
 * @param document - the document to get children for.
 * @param sharedTree - the shared tree to filter from, if available.
 * @returns the children of the document.
 */
function useChildren(
  document: Document,
  sharedTree: NavigationNode | undefined
): NavigationNode[] {
  return useMemo(() => {
    if (!sharedTree) {
      return document.children;
    }

    function findChildren(node: NavigationNode): NavigationNode[] | undefined {
      if (node.id === document.id) {
        return node.children;
      }

      for (const child of node.children) {
        const result = findChildren(child);
        if (result) {
          return result;
        }
      }

      return undefined;
    }

    return findChildren(sharedTree) || [];
  }, [document.id, document.children, sharedTree]);
}

/**
 * Hook to get backlinks for a document, filtering from the shared tree if available.
 *
 * @param document - the document to get backlinks for.
 * @returns documents that link to this document.
 */
function useBacklinks(
  document: Document,
  sharedTree: NavigationNode | undefined
): Document[] {
  if (sharedTree) {
    return flattenTree(sharedTree).filter((node) =>
      document.backlinkIds?.includes(node.id)
    ) as Document[];
  }
  return document.backlinks;
}

const Content = styled.div`
  position: relative;
`;

const SectionHeader = styled.div`
  display: flex;
  gap: 20px;
  margin-block: 0 4px;
  padding-block-end: 8px;
  border-block-end: 1px solid ${s("divider")};
`;

const SectionTab = styled.button<{ $active: boolean }>`
  padding: 0;
  border: 0;
  background: none;
  color: ${(props) =>
    props.$active ? props.theme.text : props.theme.textTertiary};
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  cursor: var(--pointer);

  &: ${hover} {
    color: ${s("text")};
  }
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

export default observer(References);
