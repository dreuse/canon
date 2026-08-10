import { observer } from "mobx-react";
import { v4 as uuidv4 } from "uuid";
import queryString from "query-string";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation, useRouteMatch } from "react-router-dom";
import { Waypoint } from "react-waypoint";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { Pagination } from "@shared/constants";
import { s } from "@shared/styles";
import { metaDisplay } from "@shared/utils/keyboard";
import type {
  SortFilter as TSortFilter,
  DirectionFilter as TDirectionFilter,
  DateFilter as TDateFilter,
} from "@shared/types";
import { StatusFilter as TStatusFilter } from "@shared/types";
import ArrowKeyNavigation from "~/components/ArrowKeyNavigation";
import DocumentListItem from "~/components/DocumentListItem";
import DocumentSelectionToolbar from "~/components/DocumentSelectionToolbar";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import LoadingIndicator from "~/components/LoadingIndicator";
import { ModelSelectionProvider } from "~/components/ModelSelectionContext";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import env from "~/env";
import usePaginatedRequest from "~/hooks/usePaginatedRequest";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import type { PaginationParams, SearchResult } from "~/types";
import { preventDefault } from "~/utils/events";
import { searchPath } from "~/utils/routeHelpers";
import { queryIsInTitle } from "~/utils/searchContext";
import { decodeURIComponentSafe, isTruthyQueryValue } from "~/utils/urls";
import CollectionFilter from "./components/CollectionFilter";
import DateFilter from "./components/DateFilter";
import { DocumentFilter } from "./components/DocumentFilter";
import DocumentTypeFilter from "./components/DocumentTypeFilter";
import RecentSearches from "./components/RecentSearches";
import SearchInput from "./components/SearchInput";
import { SortInput } from "./components/SortInput";
import UserFilter from "./components/UserFilter";
import { HStack } from "~/components/primitives/HStack";
import useMobile from "~/hooks/useMobile";

function Search() {
  const { t } = useTranslation();
  const { documents, searches, policies } = useStores();
  const isMobile = useMobile();

  // routing
  const params = useQuery();
  const location = useLocation();
  const history = useHistory();
  const routeMatch = useRouteMatch<{ query: string }>();
  const handleGoBack = React.useCallback(() => history.goBack(), [history]);

  // refs
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const resultListRef = React.useRef<HTMLDivElement | null>(null);
  const recentSearchesRef = React.useRef<HTMLDivElement | null>(null);

  // filters
  const decodedQuery = decodeURIComponentSafe(
    routeMatch.params.query ?? params.get("q") ?? params.get("query") ?? ""
  ).trim();
  const query = decodedQuery !== "" ? decodedQuery : undefined;
  const collectionId = params.get("collectionId") ?? "";
  const userId = params.get("userId") ?? "";
  const documentId = params.get("documentId") ?? undefined;
  const dateFilter = (params.get("dateFilter") as TDateFilter) ?? "";
  // Keyed on the serialized value so the array keeps a stable identity between
  // renders and can be used directly as a dependency.
  const statusFilterKey = params.getAll("statusFilter").join(",");
  const statusFilter = React.useMemo(
    () =>
      statusFilterKey
        ? (statusFilterKey.split(",") as TStatusFilter[])
        : [TStatusFilter.Published, TStatusFilter.Draft],
    [statusFilterKey]
  );
  const titleFilter = isTruthyQueryValue(params.get("titleFilter"));
  const sort = (params.get("sort") as TSortFilter) ?? "";
  const direction = (params.get("direction") as TDirectionFilter) ?? "";

  const isSearchable = !!(query || collectionId || userId);

  const document = documentId ? documents.get(documentId) : undefined;

  const filterVisibility = {
    document: !!document,
    collection: !document,
    user: !document || !!(document && query),
    documentType: isSearchable,
    date: isSearchable,
    title: !!query && !document,
    sort: isSearchable,
  };

  const filters = React.useMemo(
    () => ({
      query,
      statusFilter,
      collectionId,
      userId,
      dateFilter,
      titleFilter,
      documentId,
      sort,
      direction,
    }),
    [
      query,
      statusFilter,
      collectionId,
      userId,
      dateFilter,
      titleFilter,
      documentId,
      sort,
      direction,
    ]
  );

  const requestFn = React.useMemo(() => {
    // Add to the searches store so this search can immediately appear in the recent searches list
    // without a flash of loading.
    if (query) {
      searches.add({
        id: uuidv4(),
        query,
        createdAt: new Date().toISOString(),
      });
    }

    if (isSearchable) {
      return async (params?: PaginationParams) => {
        const paginationParams = {
          offset: params?.offset,
          limit: params?.limit,
        };
        return titleFilter
          ? await documents.searchTitles({ ...filters, ...paginationParams })
          : await documents.search({ ...filters, ...paginationParams });
      };
    }

    return () => Promise.resolve([] as SearchResult[]);
  }, [query, titleFilter, filters, searches, documents, isSearchable]);

  const { data, next, end, error, loading } = usePaginatedRequest(requestFn, {
    limit: Pagination.defaultLimit,
  });

  // A title match and a passing mention answer the query differently, so they
  // are shown as two groups rather than one ranked list.
  // ponytail: regrouping runs over every page loaded so far, which can move an
  // earlier row down as the next page arrives. Fix by grouping per page if it
  // proves distracting.
  const [titleMatches, textMatches] = React.useMemo(() => {
    const inTitle: SearchResult[] = [];
    const inText: SearchResult[] = [];
    for (const result of data ?? []) {
      (queryIsInTitle(result.document.title, query) ? inTitle : inText).push(
        result
      );
    }
    return [inTitle, inText];
  }, [data, query]);

  const isGrouped = titleMatches.length > 0 && textMatches.length > 0;
  const groupedData = React.useMemo(
    () => [...titleMatches, ...textMatches],
    [titleMatches, textMatches]
  );
  const total = documents.searchTotal ?? data?.length;

  // Only updatable documents are selectable, matching the per-item checkboxes.
  const itemIds = React.useMemo(
    () =>
      data
        ?.filter((result) => policies.abilities(result.document.id).update)
        .map((result) => result.document.id) ?? [],
    [data, policies]
  );

  const updateLocation = (query: string) => {
    // If query came from route params, navigate to base search path
    const pathname = routeMatch.params.query ? searchPath() : location.pathname;

    history.replace({
      pathname,
      search: queryString.stringify(
        { ...queryString.parse(location.search), q: query },
        {
          skipEmptyString: true,
        }
      ),
    });
  };

  // All filters go through the query string so that searches are bookmarkable, which neccesitates
  // some complexity as the query string is the source of truth for the filters.
  const handleFilterChange = (search: {
    collectionId?: string | undefined;
    documentId?: string | undefined;
    userId?: string | undefined;
    dateFilter?: TDateFilter;
    statusFilter?: TStatusFilter[];
    titleFilter?: boolean | undefined;
    sort?: string | undefined;
    direction?: string | undefined;
  }) => {
    if (search.sort === "relevance") {
      search.sort = undefined;
      search.direction = undefined;
    }

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

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.nativeEvent.isComposing) {
      return;
    }

    if (ev.key === "Enter") {
      updateLocation(ev.currentTarget.value);
      return;
    }

    if (ev.key === "Escape") {
      ev.preventDefault();
      return history.goBack();
    }

    if (ev.key === "ArrowUp") {
      if (ev.currentTarget.value) {
        const length = ev.currentTarget.value.length;
        const selectionEnd = ev.currentTarget.selectionEnd || 0;
        if (selectionEnd === 0) {
          ev.currentTarget.selectionStart = 0;
          ev.currentTarget.selectionEnd = length;
          ev.preventDefault();
        }
      }
    }

    if (ev.key === "ArrowDown" && !ev.shiftKey) {
      ev.preventDefault();

      if (ev.currentTarget.value) {
        const length = ev.currentTarget.value.length;
        const selectionStart = ev.currentTarget.selectionStart || 0;
        if (selectionStart < length) {
          ev.currentTarget.selectionStart = length;
          ev.currentTarget.selectionEnd = length;
          return;
        }
      }

      const firstItem = (resultListRef.current?.querySelector("a") ??
        recentSearchesRef.current?.firstElementChild) as HTMLAnchorElement;

      firstItem?.focus();
    }
  };

  const handleEscape = () => searchInputRef.current?.focus();
  const showEmpty = !loading && query && data?.length === 0;

  const renderResult = (result: SearchResult) => (
    <DocumentListItem
      key={result.document.id}
      document={result.document}
      highlight={query}
      context={result.context}
      showCollection
      showPath
    />
  );

  const sortInput = filterVisibility.sort ? (
    <SortInput
      sort={sort}
      direction={direction}
      onSelect={(sort, direction) => handleFilterChange({ sort, direction })}
    />
  ) : null;

  return (
    <Scene
      measure="index"
      textTitle={query ? `${query} – ${t("Search")}` : t("Search")}
      actions={isMobile ? sortInput : null}
    >
      <RegisterKeyDown trigger="Escape" handler={handleGoBack} />
      {loading && <LoadingIndicator />}
      <ResultsWrapper column auto>
        <form method="GET" action={searchPath()} onSubmit={preventDefault}>
          <SearchInput
            name="query"
            key={query ? "search" : "recent"}
            ref={searchInputRef}
            placeholder={`${
              documentId
                ? t("Search in document")
                : collectionId
                  ? t("Search in collection")
                  : t("Search")
            }…`}
            onKeyDown={handleKeyDown}
            onClear={() => updateLocation("")}
            defaultValue={query ?? ""}
          />
          <Filters>
            <Flex align="center" gap={4} wrap>
              {isSearchable && data && (
                <ResultCount>
                  {t("{{count}} result", { count: total ?? 0 })}
                </ResultCount>
              )}
              {filterVisibility.document && (
                <DocumentFilter
                  document={document!}
                  onClick={() => {
                    handleFilterChange({ documentId: undefined });
                  }}
                />
              )}
              {filterVisibility.collection && (
                <CollectionFilter
                  collectionId={collectionId}
                  onSelect={(collectionId) =>
                    handleFilterChange({ collectionId })
                  }
                />
              )}
              {filterVisibility.user && (
                <UserFilter
                  userId={userId}
                  onSelect={(userId) => handleFilterChange({ userId })}
                />
              )}
              {filterVisibility.documentType && (
                <DocumentTypeFilter
                  statusFilter={statusFilter}
                  onSelect={({ statusFilter }) =>
                    handleFilterChange({ statusFilter })
                  }
                />
              )}
              {filterVisibility.date && (
                <DateFilter
                  dateFilter={dateFilter}
                  onSelect={(dateFilter) => handleFilterChange({ dateFilter })}
                />
              )}
              {filterVisibility.title && (
                <SearchTitlesFilter
                  width={26}
                  height={14}
                  label={t("Search titles only")}
                  onChange={(checked: boolean) => {
                    handleFilterChange({ titleFilter: checked });
                  }}
                  checked={titleFilter}
                  inForm={false}
                />
              )}
            </Flex>
            {isMobile ? null : sortInput}
          </Filters>
        </form>
        {isSearchable ? (
          <>
            {error ? (
              <Fade>
                <Centered column>
                  <Text as="h1">{t("Something went wrong")}</Text>
                  <Text as="p" type="secondary">
                    {t(
                      "Please try again or contact support if the problem persists"
                    )}
                    .
                  </Text>
                </Centered>
              </Fade>
            ) : showEmpty ? (
              <Fade>
                <Centered column>
                  <Text as="p" type="secondary">
                    {t("No documents found for your search filters.")}
                  </Text>
                </Centered>
              </Fade>
            ) : null}
            <ModelSelectionProvider
              items={itemIds}
              toolbar={<DocumentSelectionToolbar />}
            >
              <ResultList column>
                <StyledArrowKeyNavigation
                  ref={resultListRef}
                  onEscape={handleEscape}
                  aria-label={t("Search Results")}
                  items={groupedData}
                >
                  {() =>
                    groupedData.length && !error ? (
                      <>
                        {isGrouped && (
                          <GroupHeading>
                            {t("In the title")}
                            <GroupCount>{titleMatches.length}</GroupCount>
                          </GroupHeading>
                        )}
                        {titleMatches.map(renderResult)}
                        {isGrouped && (
                          <GroupHeading>
                            {t("Mentioned in the text")}
                            <GroupCount>{textMatches.length}</GroupCount>
                          </GroupHeading>
                        )}
                        {textMatches.map(renderResult)}
                      </>
                    ) : null
                  }
                </StyledArrowKeyNavigation>
                <Waypoint
                  key={data?.length}
                  onEnter={end || loading ? undefined : next}
                  debug={env.ENVIRONMENT === "development"}
                />
                {groupedData.length > 0 && !error && (
                  <Footer align="center" justify="space-between">
                    <span>
                      {total !== undefined && groupedData.length < total
                        ? t("Showing {{shown}} of {{total}}", {
                            shown: groupedData.length,
                            total,
                          })
                        : null}
                    </span>
                    <span>
                      {t("↑ ↓ to move")} · {t("↵ to open")} ·{" "}
                      {t("{{meta}}↵ in a new tab", { meta: metaDisplay })}
                    </span>
                  </Footer>
                )}
              </ResultList>
            </ModelSelectionProvider>
          </>
        ) : documentId ? null : (
          <RecentSearches ref={recentSearchesRef} onEscape={handleEscape} />
        )}
      </ResultsWrapper>
    </Scene>
  );
}

const Centered = styled(Flex)`
  text-align: center;
  margin: 30vh auto 0;
  max-width: 380px;
  transform: translateY(-50%);
`;

const ResultsWrapper = styled(Flex)`
  ${breakpoint("tablet")`
    margin-top: 40px;
  `};
`;

const ResultList = styled(Flex)`
  margin-bottom: 150px;
`;

const StyledArrowKeyNavigation = styled(ArrowKeyNavigation)`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const Filters = styled(HStack)`
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 12px;
  transition: opacity 100ms ease-in-out;
  padding: 8px 0;

  ${breakpoint("tablet")`
    padding: 0;
  `};
`;

const ResultCount = styled.span`
  color: ${s("textTertiary")};
  font-size: 14px;
  white-space: nowrap;
  margin-inline-end: 8px;
`;

const GroupHeading = styled.h2`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 24px 0 4px;
  padding: 0 8px;
  color: ${s("textTertiary")};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;

  &:first-child {
    margin-top: 8px;
  }
`;

const GroupCount = styled.span`
  font-weight: 400;
  letter-spacing: 0;
`;

const Footer = styled(Flex)`
  margin-top: 16px;
  padding: 12px 8px 0;
  border-top: 1px solid ${s("divider")};
  color: ${s("textTertiary")};
  font-size: 13px;
  gap: 8px;
  flex-wrap: wrap;
`;

const SearchTitlesFilter = styled(Switch)`
  white-space: nowrap;
  margin-left: 8px;
  font-size: 14px;
  font-weight: 400;
  height: 28px;
`;

export default observer(Search);
