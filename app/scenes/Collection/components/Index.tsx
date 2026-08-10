import { observer } from "mobx-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { hairline, s } from "@shared/styles";
import type { NavigationNode } from "@shared/types";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import type DocumentsStore from "~/stores/DocumentsStore";
import Time from "~/components/Time";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import { CollectionOrder } from "./Navigation";

const CARD_SUMMARY_BLOCKS = 2;
const CHILD_SUMMARY_BLOCKS = 1;
const CARD_CHILD_LIMIT = 4;
const INDEX_PAGE_SIZE = 100;
const INDEX_MAX_PAGES = 3;

function summarize(document: Document | undefined, blocks: number): string {
  return document
    ? ProsemirrorDataHelper.toPlainText(document.getSummary(blocks))
    : "";
}

function sortNodes(
  nodes: NavigationNode[],
  order: CollectionOrder,
  documents: DocumentsStore
): NavigationNode[] {
  const rank = (node: NavigationNode): string | number => {
    const document = documents.get(node.id);

    switch (order) {
      case CollectionOrder.Updated:
      case CollectionOrder.Old:
        return document?.updatedAt ?? "";
      case CollectionOrder.Published:
        return document?.publishedAt ?? "";
      case CollectionOrder.Popular:
        return document?.popularityScore ?? 0;
      default:
        return (node.title ?? "").toLowerCase();
    }
  };

  if (order === CollectionOrder.Structure) {
    return nodes;
  }

  const descending =
    order === CollectionOrder.Updated ||
    order === CollectionOrder.Published ||
    order === CollectionOrder.Popular;

  return [...nodes].sort((a, b) => {
    const left = rank(a);
    const right = rank(b);
    if (left === right) {
      return 0;
    }
    const ascending = left < right ? -1 : 1;
    return descending ? -ascending : ascending;
  });
}

type Props = {
  collection: Collection;
  order: CollectionOrder;
};

export const Index = observer(function Index_({ collection, order }: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const sidebarContext = useLocationSidebarContext();

  useEffect(() => {
    void collection.fetchDocuments();

    void (async () => {
      for (let page = 0; page < INDEX_MAX_PAGES; page++) {
        const results = await documents.fetchPage({
          collectionId: collection.id,
          limit: INDEX_PAGE_SIZE,
          offset: page * INDEX_PAGE_SIZE,
        });

        if (results.length < INDEX_PAGE_SIZE) {
          return;
        }
      }
    })();
  }, [collection, documents]);

  const roots = useMemo(
    () => sortNodes(collection.sortedDocuments ?? [], order, documents),
    [collection.sortedDocuments, order, documents]
  );

  if (!roots.length) {
    return null;
  }

  return (
    <Wrapper>
      <Label>
        {t("Contents")}
        {collection.documentCount !== undefined && (
          <>
            {" "}
            · {t("{{ count }} documents", { count: collection.documentCount })}
          </>
        )}
      </Label>
      <Cards>
        {roots.map((node) => {
          const document = documents.get(node.id);

          return (
            <Card key={node.id}>
              <Title
                to={{ pathname: node.url, state: { sidebarContext } }}
                dir="auto"
              >
                {node.title || t("Untitled")}
              </Title>
              <Excerpt>{summarize(document, CARD_SUMMARY_BLOCKS)}</Excerpt>
              {node.children.length > 0 && (
                <Children>
                  {node.children.slice(0, CARD_CHILD_LIMIT).map((child) => (
                    <Child key={child.id}>
                      <ChildLink
                        to={{ pathname: child.url, state: { sidebarContext } }}
                        dir="auto"
                      >
                        {child.title || t("Untitled")}
                      </ChildLink>
                      <ChildExcerpt>
                        {summarize(
                          documents.get(child.id),
                          CHILD_SUMMARY_BLOCKS
                        )}
                      </ChildExcerpt>
                    </Child>
                  ))}
                  {node.children.length > CARD_CHILD_LIMIT && (
                    <MoreLink
                      to={{ pathname: node.url, state: { sidebarContext } }}
                    >
                      {t("{{ count }} more", {
                        count: node.children.length - CARD_CHILD_LIMIT,
                      })}
                    </MoreLink>
                  )}
                </Children>
              )}
              {document && (
                <Meta>
                  {document.updatedBy?.name}
                  {document.updatedBy?.name && " · "}
                  {t("updated")}{" "}
                  <Time dateTime={document.updatedAt} addSuffix />
                </Meta>
              )}
            </Card>
          );
        })}
      </Cards>
    </Wrapper>
  );
});

const Wrapper = styled.div`
  margin-top: 24px;
`;

const Label = styled.h3`
  margin: 0 0 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${s("textTertiary")};
`;

const Cards = styled.div`
  columns: 280px;
  column-gap: 16px;
`;

const Card = styled.section`
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
  padding: 16px 20px;
  border: 1px solid ${hairline};
  border-radius: 8px;
  break-inside: avoid;
`;

const Title = styled(Link)`
  font-size: 15px;
  font-weight: 600;
  color: ${s("text")};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const Excerpt = styled.p`
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${s("textSecondary")};
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Children = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 12px;
  border-top: 1px solid ${hairline};
`;

const Child = styled.div`
  padding: 10px 0;

  & + & {
    border-top: 1px solid ${hairline};
  }
`;

const ChildLink = styled(Link)`
  font-size: 13px;
  font-weight: 500;
  color: ${s("accent")};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const MoreLink = styled(Link)`
  padding: 10px 0 0;
  border-top: 1px solid ${hairline};
  font-size: 12px;
  color: ${s("textTertiary")};
  text-decoration: none;

  &:hover {
    color: ${s("text")};
  }
`;

const ChildExcerpt = styled.p`
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: ${s("textTertiary")};
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Meta = styled.p`
  margin: 12px 0 0;
  padding-top: 12px;
  border-top: 1px solid ${hairline};
  font-size: 12px;
  color: ${s("textTertiary")};
`;
