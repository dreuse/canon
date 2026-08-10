import { observer } from "mobx-react";
import { ArchiveIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import DocumentListItem from "~/components/DocumentListItem";
import Empty from "~/components/Empty";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import { PageHeader } from "~/components/PageHeader";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import Scene from "~/components/Scene";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";

function Archive() {
  const { t } = useTranslation();
  const { documents, collections } = useStores();

  useRequest(collections.fetchArchived, true);

  const archivedCollections = collections.archived;
  const archivedCollectionIds = new Set(
    archivedCollections.map((collection) => collection.id)
  );

  const groups = archivedCollections
    .map((collection) => ({
      collection,
      children: documents.archived.filter(
        (document) => document.collectionId === collection.id
      ),
    }))
    .filter((group) => group.children.length > 0);

  const ungrouped = documents.archived.filter(
    (document) =>
      !document.collectionId ||
      !archivedCollectionIds.has(document.collectionId)
  );

  return (
    <Scene measure="index" icon={<ArchiveIcon />} title={t("Archive")}>
      <PageHeader
        title={t("Archive")}
        caption={t("Archived documents, which can be restored at any time")}
      />
      {groups.map(({ collection, children }) => (
        <Group key={collection.id}>
          <GroupHeading to={collection.path}>
            <CollectionIcon collection={collection} size={18} />
            <GroupName>{collection.name}</GroupName>
            <GroupCount>
              {t("{{ count }} documents", { count: children.length })}
            </GroupCount>
          </GroupHeading>
          {children.map((document) => (
            <DocumentListItem key={document.id} document={document} showPath />
          ))}
        </Group>
      ))}
      <PaginatedDocumentList
        documents={ungrouped}
        fetch={documents.fetchArchived}
        empty={
          groups.length ? undefined : (
            <Empty>{t("The document archive is empty at the moment.")}</Empty>
          )
        }
        showCollection
        showPath
        showTemplate
      />
    </Scene>
  );
}

const Group = styled.section`
  margin-bottom: 24px;
`;

const GroupHeading = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  color: ${s("text")};

  &:hover {
    background: ${s("listItemHoverBackground")};
    border-radius: 6px;
  }
`;

const GroupName = styled.span`
  font-size: 15px;
  font-weight: 600;
`;

const GroupCount = styled.span`
  font-size: 12.5px;
  color: ${s("textTertiary")};
`;

export default observer(Archive);
