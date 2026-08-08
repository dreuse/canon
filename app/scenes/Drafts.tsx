import { observer } from "mobx-react";
import { DraftsIcon } from "outline-icons";
import queryString from "query-string";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { DateFilter as TDateFilter } from "@shared/types";
import CollectionFilter from "~/scenes/Search/components/CollectionFilter";
import { Action } from "~/components/Actions";
import Empty from "~/components/Empty";
import FilterOptions from "~/components/FilterOptions";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import Scene from "~/components/Scene";
import useStores from "~/hooks/useStores";
import NewDocumentMenu from "~/menus/NewDocumentMenu";
import DateFilter from "./Search/components/DateFilter";

const DEFAULT_SORT = "updatedAt-desc";

function Drafts() {
  const { t } = useTranslation();
  const { documents } = useStores();
  const history = useHistory();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const collectionId = params.get("collectionId") || undefined;
  const dateFilter = (params.get("dateFilter") || undefined) as TDateFilter;
  const sortKey = params.get("sort") || DEFAULT_SORT;

  const sortOptions = [
    { key: "updatedAt-desc", label: t("Recently updated") },
    { key: "updatedAt-asc", label: t("Least recently updated") },
    { key: "createdAt-desc", label: t("Newest") },
    { key: "title-asc", label: t("A–Z") },
  ];

  const handleFilterChange = (search: {
    dateFilter?: string | null | undefined;
    collectionId?: string | null | undefined;
    sort?: string | null | undefined;
  }) => {
    history.replace({
      pathname: location.pathname,
      search: queryString.stringify(
        { ...queryString.parse(location.search), ...search },
        {
          skipEmptyString: true,
        }
      ),
    });
  };

  const isFiltered = collectionId || dateFilter;
  const [sort, sortDirection] = sortKey.split("-") as [
    "updatedAt" | "createdAt" | "title",
    "asc" | "desc",
  ];
  const options = {
    dateFilter,
    collectionId,
    sort,
    sortDirection,
  };
  const drafts = documents.drafts(options);

  return (
    <Scene
      icon={<DraftsIcon />}
      title={t("Drafts")}
      actions={
        <Action>
          <NewDocumentMenu />
        </Action>
      }
    >
      <Heading>{t("Drafts")}</Heading>
      <Caption>
        {t("{{ count }} drafts", { count: drafts.length })} &middot;{" "}
        {t("only you can see these")}
      </Caption>
      <Filters>
        <CollectionFilter
          collectionId={collectionId}
          onSelect={(collectionId) =>
            handleFilterChange({
              collectionId,
            })
          }
        />
        <DateFilter
          dateFilter={dateFilter}
          onSelect={(dateFilter) =>
            handleFilterChange({
              dateFilter,
            })
          }
        />
        <Spacer />
        <FilterOptions
          options={sortOptions}
          selectedKeys={[sortKey]}
          defaultLabel={t("Recently updated")}
          showIcons={false}
          onSelect={(key) => handleFilterChange({ sort: key })}
        />
      </Filters>

      <PaginatedDocumentList
        empty={
          <Empty>
            {isFiltered
              ? t("No documents found for your filters.")
              : t("You’ve not got any drafts at the moment.")}
          </Empty>
        }
        fetch={documents.fetchDrafts}
        documents={drafts}
        options={options}
        showParentDocuments
        showCollection
        showDraft={false}
      />
    </Scene>
  );
}

const Caption = styled.p`
  margin: -12px 0 20px;
  color: ${s("textTertiary")};
  font-size: 14px;
`;

const Filters = styled(Flex)`
  align-items: center;
  margin-bottom: 4px;
  opacity: 0.85;
  transition: opacity 100ms ease-in-out;
  gap: 4px;

  &:hover {
    opacity: 1;
  }
`;

const Spacer = styled.span`
  flex: 1;
`;

export default observer(Drafts);
