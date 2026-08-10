import { maxBy, uniq } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { hairline, s } from "@shared/styles";
import type { NavigationNode } from "@shared/types";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import type Collection from "~/models/Collection";
import { AvatarSize } from "~/components/Avatar";
import Facepile from "~/components/Facepile";
import Time from "~/components/Time";
import useStores from "~/hooks/useStores";
import { collectionPath } from "~/utils/routeHelpers";

const MEMBER_LIMIT = 6;
const STALE_SCAN_LIMIT = 100;
const RELATED_FETCH_LIMIT = 12;

function depthOf(nodes: NavigationNode[]): number {
  return nodes.length
    ? 1 + Math.max(...nodes.map((node) => depthOf(node.children)))
    : 0;
}

type Props = {
  collection: Collection;
  onShowOldest?: () => void;
};

export const StatusRail = observer(function StatusRail_({
  collection,
  onShowOldest,
}: Props) {
  const { t } = useTranslation();
  const { collections, documents, memberships, groupMemberships, users } =
    useStores();
  const reviewIntervalDays = collection.reviewIntervalDays;
  const inCollection = documents.inCollection(collection.id);

  const linkedSlugs = useMemo(
    () =>
      uniq(
        inCollection
          .flatMap((document) =>
            document.data
              ? ProsemirrorDataHelper.toLinkHrefs(document.data)
              : []
          )
          .map(parseDocumentSlug)
          .filter((slug): slug is string => !!slug)
      ),
    [inCollection]
  );

  useEffect(() => {
    void memberships.fetchPage({ id: collection.id, limit: MEMBER_LIMIT });
    void groupMemberships.fetchPage({
      collectionId: collection.id,
      limit: MEMBER_LIMIT,
    });
    void documents.fetchPage({
      collectionId: collection.id,
      sort: "updatedAt",
      direction: "DESC",
      limit: 1,
    });
  }, [collection.id, documents, groupMemberships, memberships]);

  useEffect(() => {
    if (reviewIntervalDays) {
      void documents.fetchPage({
        collectionId: collection.id,
        sort: "updatedAt",
        direction: "ASC",
        limit: STALE_SCAN_LIMIT,
      });
    }
  }, [collection.id, documents, reviewIntervalDays]);

  useEffect(() => {
    linkedSlugs
      .filter((slug) => !documents.get(slug))
      .slice(0, RELATED_FETCH_LIMIT)
      .forEach((slug) => {
        void documents.fetch(slug).catch(() => undefined);
      });
  }, [documents, linkedSlugs]);

  const members = users.inCollection(collection.id);
  const groups = groupMemberships
    .inCollection(collection.id)
    .map((membership) => membership.group)
    .filter(Boolean);

  const related = uniq(
    linkedSlugs
      .map((slug) => documents.get(slug)?.collectionId)
      .filter(
        (collectionId): collectionId is string =>
          !!collectionId && collectionId !== collection.id
      )
  )
    .map((collectionId) => collections.get(collectionId))
    .filter((item): item is Collection => !!item);

  const lastEdited = maxBy(inCollection, (document) => document.updatedAt);
  const staleCount = reviewIntervalDays
    ? inCollection.filter((document) => document.isStale).length
    : 0;

  const count = collection.documentCount;
  const levels = collection.documents ? depthOf(collection.documents) : 0;

  return (
    <>
      <Rail aria-label={t("Collection status")}>
        {(members.length > 0 || groups.length > 0) && (
          <Block>
            <Label>{t("Maintained by")}</Label>
            {members.length > 0 && (
              <Facepile
                users={members}
                size={AvatarSize.Medium}
                limit={MEMBER_LIMIT}
              />
            )}
            {groups.length > 0 && (
              <Value>{groups.map((group) => group.name).join(", ")}</Value>
            )}
          </Block>
        )}

        <Block>
          <Label>{t("Status")}</Label>
          {count !== undefined && (
            <Value>
              {t("{{ documents }} in {{ levels }}", {
                documents: t("{{ count }} documents", { count }),
                levels: t("{{ count }} levels", { count: levels }),
              })}
            </Value>
          )}
          {lastEdited && (
            <Value>
              {t("Last edited")}{" "}
              <Time dateTime={lastEdited.updatedAt} addSuffix />
            </Value>
          )}
        </Block>

        {!!reviewIntervalDays && staleCount > 0 && (
          <Block>
            <Label>{t("Needs attention")}</Label>
            <Value>
              {t(
                "{{ count }} documents have not been reviewed in over {{ period }}",
                {
                  count: staleCount,
                  period: t("{{ count }} days", { count: reviewIntervalDays }),
                }
              )}
            </Value>
            <Action type="button" onClick={onShowOldest}>
              {t("Verify")}
            </Action>
          </Block>
        )}
      </Rail>

      {related.length > 0 && (
        <Rail aria-label={t("Related collections")}>
          <Block>
            <Label>{t("Related collections")}</Label>
            {related.map((item) => (
              <RelatedLink key={item.id} to={collectionPath(item)}>
                {item.name}
              </RelatedLink>
            ))}
          </Block>
        </Rail>
      )}
    </>
  );
});

const Rail = styled.aside`
  padding: 16px;
  border-radius: 8px;
  background: ${s("backgroundSecondary")};
`;

const Block = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 0;

  & + & {
    border-top: 1px solid ${hairline};
  }

  &:first-child {
    padding-top: 0;
  }

  &:last-child {
    padding-bottom: 0;
  }
`;

const Label = styled.h3`
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${s("textTertiary")};
`;

const Value = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${s("textSecondary")};
`;

const Action = styled.button`
  margin-top: 4px;
  padding: 5px 12px;
  border: 1px solid ${s("inputBorder")};
  border-radius: 4px;
  background: none;
  font-size: 13px;
  font-weight: 500;
  color: ${s("text")};
  cursor: var(--pointer);

  &:hover {
    background: ${s("listItemHoverBackground")};
  }
`;

const RelatedLink = styled(Link)`
  font-size: 13px;
  color: ${s("text")};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;
