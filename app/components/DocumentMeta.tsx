import { subYears } from "date-fns";
import type { LocationDescriptor } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { s, ellipsis } from "@shared/styles";
import type Document from "~/models/Document";
import type Revision from "~/models/Revision";
import { Avatar } from "~/components/Avatar";
import DocumentTasks from "~/components/DocumentTasks";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";

type Props = {
  /** Additional content appended to the end of the meta. */
  children?: React.ReactNode;
  /** Show the collection that the document belongs to. */
  showCollection?: boolean;
  /** Show who created the document, ahead of the update line. */
  showOwner?: boolean;
  /** Show the published time, even when the document has since been updated. */
  showPublished?: boolean;
  /** Show when the current user last viewed the document. */
  showLastViewed?: boolean;
  /** Show the number of documents nested under this one. */
  showParentDocuments?: boolean;
  /** Show the parent documents the document sits under, in place of the time. */
  showPath?: boolean;
  /** The document to display meta information for. */
  document: Document;
  /** A revision of the document, when displaying meta for a point in history. */
  revision?: Revision;
  /** Replace the current history entry instead of pushing a new one when `to` is set. */
  replace?: boolean;
  /** Destination to link the meta content to. */
  to?: LocationDescriptor;
  /** Called when the meta content is clicked, renders it as a button. Takes precedence over `to`. */
  onClick?: () => void;
};

const DocumentMeta: React.FC<Props> = ({
  showPublished,
  showCollection,
  showOwner,
  showLastViewed,
  showParentDocuments,
  showPath,
  document,
  revision,
  children,
  replace,
  to,
  onClick,
  ...rest
}: Props) => {
  const { t } = useTranslation();
  const { collections } = useStores();
  const user = useCurrentUser();
  const {
    modifiedSinceViewed,
    updatedAt,
    updatedBy,
    createdAt,
    publishedAt,
    archivedAt,
    deletedAt,
    isDraft,
    lastViewedAt,
    isTasks,
  } = document;

  // Prevent meta information from displaying if updatedBy is not available.
  // Currently the situation where this is true is rendering share links.
  if (!updatedBy) {
    return null;
  }

  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const lastUpdatedByCurrentUser = user.id === updatedBy.id;
  const userName = updatedBy.name;
  let content;
  let metaDate = updatedAt;

  if (revision) {
    metaDate = revision.createdAt;
    content = (
      <span>
        {revision.createdBy?.id === user.id
          ? t("You updated")
          : t("{{ userName }} updated", { userName })}{" "}
        <Time dateTime={revision.createdAt} addSuffix />
      </span>
    );
  } else if (deletedAt) {
    metaDate = deletedAt;
    content = (
      <span>
        {lastUpdatedByCurrentUser
          ? t("You deleted")
          : t("{{ userName }} deleted", { userName })}{" "}
        <Time dateTime={deletedAt} addSuffix />
      </span>
    );
  } else if (archivedAt) {
    metaDate = archivedAt;
    content = (
      <span>
        {lastUpdatedByCurrentUser
          ? t("You archived")
          : t("{{ userName }} archived", { userName })}{" "}
        <Time dateTime={archivedAt} addSuffix />
      </span>
    );
  } else if (
    document.sourceMetadata &&
    document.sourceMetadata?.importedAt &&
    document.sourceMetadata.importedAt >= updatedAt
  ) {
    metaDate = createdAt;
    content = (
      <span>
        {document.sourceMetadata.createdByName
          ? t("{{ userName }} updated", {
              userName: document.sourceMetadata.createdByName,
            })
          : t("Imported")}{" "}
        <Time dateTime={createdAt} addSuffix />
      </span>
    );
  } else if (createdAt === updatedAt) {
    content = (
      <span>
        {lastUpdatedByCurrentUser
          ? t("You created")
          : t("{{ userName }} created", { userName })}{" "}
        <Time dateTime={updatedAt} addSuffix />
      </span>
    );
  } else if (publishedAt && (publishedAt === updatedAt || showPublished)) {
    metaDate = publishedAt;
    content = (
      <span>
        {lastUpdatedByCurrentUser
          ? t("You published")
          : t("{{ userName }} published", { userName })}{" "}
        <Time dateTime={publishedAt} addSuffix />
      </span>
    );
  } else {
    content = (
      <Modified highlight={modifiedSinceViewed && !lastUpdatedByCurrentUser}>
        {lastUpdatedByCurrentUser
          ? t("You updated")
          : t("{{ userName }} updated", { userName })}{" "}
        <Time dateTime={updatedAt} addSuffix />
      </Modified>
    );
  }

  const nestedDocumentsCount = collection
    ? collection.getChildrenForDocument(document.id).length
    : 0;
  const canShowProgressBar = isTasks && !showPath;

  const timeSinceNow = () => {
    if (isDraft || !showLastViewed) {
      return null;
    }

    if (!lastViewedAt) {
      if (lastUpdatedByCurrentUser) {
        return null;
      }
      return (
        <Viewed>
          <Separator />
          <Modified highlight>{t("Never viewed")}</Modified>
        </Viewed>
      );
    }

    // Hide the section entirely once the last view is over a year old.
    if (new Date(lastViewedAt) < subYears(new Date(), 1)) {
      return null;
    }

    return (
      <Viewed>
        <Separator />
        {t("Viewed")} <Time dateTime={lastViewedAt} addSuffix shorten />
      </Viewed>
    );
  };

  return (
    <Container align="center" $rtl={document.dir === "rtl"} {...rest} dir="ltr">
      {showOwner && document.createdBy && (
        <Owner>
          <Avatar model={document.createdBy} size={18} />
          {t("Owned by")}
          <Strong>{document.createdBy.name}</Strong>
          <Separator />
        </Owner>
      )}
      {showPath ? (
        <>
          {showCollection && (
            <Chip $unfiled={!collection}>
              {collection ? collection.name : t("Unfiled")}
            </Chip>
          )}
          <Path>
            {document.pathTo.slice(0, -1).map((node, index) => (
              <React.Fragment key={node.id}>
                {(showCollection || index > 0) && <PathSeparator />}
                {node.title || t("Untitled")}
              </React.Fragment>
            ))}
          </Path>
        </>
      ) : showCollection ? (
        <>
          <Chip $unfiled={!collection}>
            {collection ? collection.name : t("Unfiled")}
          </Chip>
          <Separator />
          <Time dateTime={metaDate} addSuffix />
        </>
      ) : onClick ? (
        <MetaButton onClick={onClick}>{content}</MetaButton>
      ) : to ? (
        <Link to={to} replace={replace}>
          {content}
        </Link>
      ) : (
        content
      )}
      {showParentDocuments && nestedDocumentsCount > 0 && (
        <span>
          <Separator />
          {nestedDocumentsCount}{" "}
          {t("nested document", {
            count: nestedDocumentsCount,
          })}
        </span>
      )}
      {timeSinceNow()}
      {canShowProgressBar && (
        <>
          <Separator />
          <DocumentTasks document={document} />
        </>
      )}
      {children}
    </Container>
  );
};

/** A button that visually matches the surrounding meta text. */
export const MetaButton = styled(NudeButton)`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  width: auto;
  height: auto;
  border-radius: 0;
  color: inherit;
  font: inherit;
  text-align: inherit;

  &:hover {
    text-decoration: underline;
  }
`;

export const Separator = styled.span`
  padding: 0 0.4em;

  &::after {
    content: "•";
  }
`;

const Strong = styled.strong`
  font-weight: 550;
`;

const Owner = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`;

const Path = styled.span`
  ${ellipsis()}
  min-width: 0;
`;

const PathSeparator = styled.span`
  padding: 0 0.35em;
  opacity: 0.65;

  &::after {
    content: "›";
  }
`;

const Chip = styled.span<{ $unfiled?: boolean }>`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 3px 7px;
  border-radius: 4px;
  background: ${s("backgroundSecondary")};
  color: ${s("textSecondary")};
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;

  ${(props) =>
    props.$unfiled &&
    css`
      background: transparent;
      box-shadow: inset 0 0 0 1px ${props.theme.backgroundSecondary};
      font-style: italic;
    `}
`;

const Container = styled(Flex)<{ $rtl?: boolean }>`
  justify-content: ${(props) => (props.$rtl ? "flex-end" : "flex-start")};
  color: ${s("textTertiary")};
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  min-width: 0;
`;

const Viewed = styled.span`
  ${ellipsis()}
`;

const Modified = styled.span<{ highlight?: boolean }>`
  font-weight: ${(props) => (props.highlight ? "600" : "400")};
`;

export default observer(DocumentMeta);
