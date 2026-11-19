import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { transparentize } from "polished";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import { breakpoint } from "@shared/styles/breakpoint";
import { Avatar, AvatarSize } from "~/components/Avatar";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import Highlight from "~/components/Highlight";
import Time from "~/components/Time";
import useStores from "~/hooks/useStores";
import type Document from "~/models/Document";
import { VerifiedBadge } from "~/scenes/Document/components/VerifiedBadge";

const SNIPPET_LINES = 3;

const PATH_ICON_SIZE = 16;

const ACTIONS_WIDTH = 104;

const actionsInset = css`
  ${breakpoint("tablet")`
    padding-inline-end: ${ACTIONS_WIDTH}px;
  `}
`;

interface Props {
  /** The document the result stands for. */
  document: Document;
  /** The search query, highlighted in the title and snippet. */
  highlight?: string;
  /** The snippet to show, already highlighted. */
  snippet?: React.ReactNode;
  /** Badges shown after the title. */
  titleBadges?: React.ReactNode;
}

/**
 * The text of a search result row: path, title, snippet and meta line.
 *
 * @param props the content props.
 * @returns the result content.
 */
export const SearchResultContent = observer(function SearchResultContent({
  document,
  highlight,
  snippet,
  titleBadges,
}: Props) {
  const { t } = useTranslation();
  const { collections } = useStores();
  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const parents = document.pathTo
    .slice(0, -1)
    .map((node) => node.title || t("Untitled"));
  const path = [collection?.displayName ?? t("Unfiled"), ...parents];
  const { updatedBy } = document;

  return (
    <>
      <Path data-testid="search-result-path">
        {collection && (
          <CollectionIcon collection={collection} size={PATH_ICON_SIZE} />
        )}
        <PathText>{path.join(" / ")}</PathText>
      </Path>
      <Title data-testid="search-result-title">
        <Highlight
          text={document.displayTitle}
          highlight={highlight}
          dir={document.dir}
        />
        {titleBadges}
      </Title>
      {snippet && (
        <Snippet data-testid="search-result-snippet">{snippet}</Snippet>
      )}
      <Meta data-testid="search-result-meta">
        {updatedBy && (
          <>
            <Avatar model={updatedBy} size={AvatarSize.Toast} />
            <span>{updatedBy.name}</span>
            <span aria-hidden>·</span>
          </>
        )}
        <span>
          {t("edited")} <Time dateTime={document.updatedAt} addSuffix />
        </span>
        <VerifiedBadge document={document} compact />
        {document.isStale && <StaleBadge>{t("Review overdue")}</StaleBadge>}
      </Meta>
    </>
  );
});

const Path = styled.span`
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  font-size: 12px;
  line-height: 16px;
  color: ${s("textTertiary")};
  ${actionsInset}
`;

const PathText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Title = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  color: ${s("text")};
  ${actionsInset}
`;

const Snippet = styled.span`
  display: -webkit-box;
  -webkit-line-clamp: ${SNIPPET_LINES};
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 4px;
  font-size: 14px;
  line-height: 21px;
  color: ${s("textSecondary")};
  overflow-wrap: anywhere;

  mark {
    background: ${(props) => transparentize(0.82, props.theme.staleText)};
    border-bottom: 2px solid
      ${(props) => transparentize(0.35, props.theme.staleText)};
    border-radius: 0;
    color: ${s("text")};
  }
`;

const Meta = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: ${s("textTertiary")};
`;

const StaleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 12px;
  background: ${s("staleBackground")};
  color: ${s("staleText")};
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
`;
