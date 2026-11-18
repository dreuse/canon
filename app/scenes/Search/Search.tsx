import { observer } from "mobx-react";
import { v4 as uuidv4 } from "uuid";
import queryString from "query-string";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import { breakpoint } from "@shared/styles/breakpoint";
import { Pagination } from "@shared/constants";
import { s } from "@shared/styles";
import { metaDisplay } from "@shared/utils/keyboard";
import type { Filter } from "@shared/helpers/FilterHelper";
import type {
  SortFilter as TSortFilter,
  DirectionFilter as TDirectionFilter,
} from "@shared/types";
import ArrowKeyNavigation from "~/components/ArrowKeyNavigation";
import DocumentListItem from "~/components/DocumentListItem";
import DocumentSelectionToolbar from "~/components/DocumentSelectionToolbar";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import LoadingIndicator from "~/components/LoadingIndicator";
import { ModelSelectionProvider } from "~/components/ModelSelectionContext";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { Waypoint } from "~/components/Waypoint";
import usePaginatedRequest from "~/hooks/usePaginatedRequest";
import useMobile from "~/hooks/useMobile";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import useUserLocale from "~/hooks/useUserLocale";
import { PAGINATION_SYMBOL } from "~/stores/base/Store";
import type { PaginationParams, SearchResult } from "~/types";
import { preventDefault } from "~/utils/events";
import { searchPath } from "~/utils/routeHelpers";
import { queryIsInTitle } from "~/utils/searchContext";
import { decodeURIComponentSafe } from "~/utils/urls";
import { AddFilterButton } from "./components/AddFilterButton";
import { DocumentFilter } from "./components/DocumentFilter";
import RecentSearches from "./components/RecentSearches";
import SearchInput from "./components/SearchInput";
import { SortInput } from "./components/SortInput";
import { SearchFilterChip } from "./components/SearchFilterChip";
import { DateRangeDialog } from "./components/DateRangeDialog";
import type { DateRange, SearchFilter } from "./searchFilters";
import {
  TOGGLE_ON,
  formatDateRange,
  getDateRange,
  getDateRangeParamChanges,
  getFilterParamChanges,
  readFilter,
  useSearchFilters,
} from "./searchFilters";

const RESULTS_MAX_WIDTH = 880;
const INPUT_ROW_MIN_HEIGHT = 48;
const TOUCH_TARGET = 44;

function Search() {
  const { t } = useTranslation();
  const { documents, searches, policies, dialogs } = useStores();
  const userLocale = useUserLocale();
  const isMobile = useMobile();

  // routing
  const params = useQuery();
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
  const documentId =
    params.get("documentId") ?? params.get("documentId.eq") ?? undefined;
  const sort = (params.get("sort") as TSortFilter) ?? "";
  const direction = (params.get("direction") as TDirectionFilter) ?? "";
  const document = documentId ? documents.get(documentId) : undefined;

  const searchFilters = useSearchFilters();
  // A filter added from the "More" menu shows while its options are open.
  const [pendingFilterId, setPendingFilterId] = React.useState<string>();
  // A filter stays shown while its custom date range dialog is open.
  const [rangeFilterId, setRangeFilterId] = React.useState<string>();

  const { isSearchable, visibleFilters, filterStates, filters, titleFilter } =
    React.useMemo(() => {
      const visible = searchFilters.filter(
        (filter) => filter.isAvailable?.({ document }) ?? true
      );
      const states = new Map(
        visible.map((filter) => [filter.id, readFilter(filter, params)])
      );
      const setStates = [...states.values()];

      const expressions = setStates
        .map((state) => state.apiFilter)
        .filter((filter): filter is Filter => !!filter);
      if (documentId) {
        expressions.push({
          field: "documentId",
          operator: "eq",
          value: documentId,
        });
      }

      return {
        // Show results when there is a query or at least one filter is set.
        isSearchable:
          !!query || !!documentId || setStates.some((state) => state.isSet),
        visibleFilters: visible,
        filterStates: states,
        filters: expressions.length > 0 ? expressions : undefined,
        // An empty query matches every title, so list all results without one.
        titleFilter: !!query && !!states.get("titleOnly")?.isSet,
      };
    }, [searchFilters, params, query, document, documentId]);

  const rangeLabels = React.useMemo(
    () =>
      new Map(
        [...filterStates].map(([id, state]) => [
          id,
          state.range ? formatDateRange(state.range, t, userLocale) : undefined,
        ])
      ),
    [filterStates, t, userLocale]
  );

  const isCollectionScoped = !!filterStates.get("collectionId")?.isSet;

  const { shownFilters, addableFilters } = React.useMemo(() => {
    const shown = visibleFilters.filter(
      (filter) =>
        filter.pinned ||
        filterStates.get(filter.id)?.isSet ||
        pendingFilterId === filter.id ||
        rangeFilterId === filter.id
    );
    return {
      shownFilters: shown,
      addableFilters: visibleFilters.filter(
        (filter) => !shown.includes(filter)
      ),
    };
  }, [visibleFilters, filterStates, pendingFilterId, rangeFilterId]);

  const requestParams = React.useMemo(
    () => ({
      query,
      titleFilter,
      sort,
      direction,
      filters,
    }),
    [query, titleFilter, sort, direction, filters]
  );

  const [resultCount, setResultCount] = React.useState<{
    params: typeof requestParams;
    total: number;
  }>();

  // Responses from earlier searches must not replace the current count.
  const currentRequestParams = React.useRef(requestParams);
  React.useEffect(() => {
    currentRequestParams.current = requestParams;
  }, [requestParams]);

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
        if (titleFilter) {
          return await documents.searchTitles({
            ...requestParams,
            ...paginationParams,
          });
        }

        const results = await documents.search({
          ...requestParams,
          ...paginationParams,
        });
        const total = results[PAGINATION_SYMBOL]?.total;
        if (
          !params?.offset &&
          total !== undefined &&
          currentRequestParams.current === requestParams
        ) {
          setResultCount({ params: requestParams, total });
        }
        return results;
      };
    }

    return () => Promise.resolve([] as SearchResult[]);
  }, [query, titleFilter, requestParams, searches, documents, isSearchable]);

  const { data, next, end, error, loading } = usePaginatedRequest(requestFn, {
    limit: Pagination.defaultLimit,
  });

  // Keep the previous count on screen, disabled, until the new one arrives.
  const isResultCountStale = resultCount?.params !== requestParams;
  const total = titleFilter || error ? undefined : resultCount?.total;

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
    const pathname = routeMatch.params.query
      ? searchPath()
      : history.location.pathname;

    history.replace({
      pathname,
      search: queryString.stringify(
        { ...queryString.parse(history.location.search), q: query },
        {
          skipEmptyString: true,
        }
      ),
    });
  };

  // All filters go through the query string so that searches are bookmarkable,
  // which means the query string is the source of truth for the filters.
  const replaceParams = React.useCallback(
    (
      getChanges: (
        current: URLSearchParams
      ) => Record<string, string | string[] | undefined>
    ) => {
      const { search } = history.location;
      history.replace({
        pathname: history.location.pathname,
        search: queryString.stringify(
          {
            ...queryString.parse(search),
            ...getChanges(new URLSearchParams(search)),
          },
          { skipEmptyString: true, arrayFormat: "comma" }
        ),
      });
    },
    [history]
  );

  const handleChangeFilter = React.useCallback(
    (filter: SearchFilter, values: string[] | undefined) =>
      replaceParams((current) =>
        getFilterParamChanges(filter, values, current)
      ),
    [replaceParams]
  );

  const handleCustomRange = React.useCallback(
    (filter: SearchFilter) => {
      const handleSubmit = (range: Required<DateRange>) => {
        replaceParams((current) =>
          getDateRangeParamChanges(filter, range, current)
        );
        setRangeFilterId(undefined);
        dialogs.closeAllModals();
      };

      setRangeFilterId(filter.id);
      dialogs.openModal({
        title: filter.label,
        width: "600px",
        onClose: () => setRangeFilterId(undefined),
        content: (
          <DateRangeDialog
            defaultRange={getDateRange(
              filter,
              new URLSearchParams(history.location.search)
            )}
            onSubmit={handleSubmit}
          />
        ),
      });
    },
    [dialogs, history, replaceParams]
  );

  const handleAddFilter = React.useCallback(
    (id: string) => {
      const filter = searchFilters.find((item) => item.id === id);
      if (filter?.type === "toggle") {
        handleChangeFilter(filter, [TOGGLE_ON]);
        return;
      }
      setPendingFilterId(id);
    },
    [searchFilters, handleChangeFilter]
  );

  const handleFilterOpenChange = React.useCallback(
    (filter: SearchFilter, open: boolean) => {
      if (!open) {
        setPendingFilterId((id) => (id === filter.id ? undefined : id));
      }
    },
    []
  );

  const handleSort = React.useCallback(
    (sort: string, direction: string) =>
      replaceParams(() =>
        sort === "relevance"
          ? { sort: undefined, direction: undefined }
          : { sort, direction }
      ),
    [replaceParams]
  );

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
  const showEmpty = !loading && isSearchable && data?.length === 0;

  const renderResult = (result: SearchResult) => (
    <DocumentListItem
      key={result.document.id}
      document={result.document}
      highlight={query}
      context={result.context}
      searchResult
    />
  );

  const renderFilterChip = (filter: SearchFilter) => (
    <SearchFilterChip
      key={filter.id}
      filter={filter}
      values={filterStates.get(filter.id)?.values ?? EMPTY_VALUES}
      isSet={!!filterStates.get(filter.id)?.isSet}
      defaultOpen={pendingFilterId === filter.id}
      onChange={handleChangeFilter}
      onOpenChange={handleFilterOpenChange}
      rangeLabel={rangeLabels.get(filter.id)}
      onCustomRange={handleCustomRange}
    />
  );

  const sortInput = isSearchable ? (
    <SortInput sort={sort} direction={direction} onSelect={handleSort} />
  ) : null;

  return (
    <Scene
      measure="index"
      textTitle={query ? `${query} – ${t("Search")}` : t("Search")}
    >
      <RegisterKeyDown trigger="Escape" handler={handleGoBack} />
      {loading && <LoadingIndicator />}
      <ResultsWrapper column auto>
        <form method="GET" action={searchPath()} onSubmit={preventDefault}>
          <InputRow align="center" gap={8}>
            <SearchInput
              name="query"
              key={query ? "search" : "recent"}
              ref={searchInputRef}
              placeholder={`${
                documentId
                  ? t("Search in document")
                  : isCollectionScoped
                    ? t("Search in collection")
                    : t("Search")
              }…`}
              onKeyDown={handleKeyDown}
              onClear={() => updateLocation("")}
              defaultValue={query ?? ""}
            />
            {isMobile && (
              <CancelButton type="button" onClick={handleGoBack}>
                {t("Cancel")}
              </CancelButton>
            )}
          </InputRow>
          <FilterChips align="center" gap={8} wrap>
            {document && (
              <DocumentFilter
                document={document}
                onRemove={() =>
                  replaceParams(() => ({
                    documentId: undefined,
                    "documentId.eq": undefined,
                  }))
                }
              />
            )}
            {shownFilters.map(renderFilterChip)}
            {addableFilters.length > 0 && (
              <AddFilterButton
                filters={addableFilters}
                onSelect={handleAddFilter}
              />
            )}
          </FilterChips>
          {sortInput && (
            <ResultsMeta
              as="div"
              type="secondary"
              size="small"
              aria-busy={isResultCountStale}
              data-testid="search-results-header"
              $disabled={isResultCountStale && total !== undefined}
            >
              {total !== undefined && (
                <span>{t("{{ count }} result", { count: total })}</span>
              )}
              {sortInput}
            </ResultsMeta>
          )}
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
        ) : (
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
  width: 100%;
  max-width: ${RESULTS_MAX_WIDTH}px;
  margin-inline: auto;

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

const InputRow = styled(Flex)`
  min-height: ${INPUT_ROW_MIN_HEIGHT}px;
`;

const CancelButton = styled.button`
  flex-shrink: 0;
  min-height: ${TOUCH_TARGET}px;
  padding: 0 10px;
  border: 0;
  background: none;
  color: ${s("accent")};
  font: inherit;
  font-weight: 500;
  cursor: var(--pointer);
`;

const FilterChips = styled(Flex)`
  row-gap: 8px;
  margin-top: 14px;

  ${breakpoint("mobile", "tablet")`
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    margin-inline: -16px;
    padding: 12px 16px;
    border-bottom: 1px solid ${s("divider")};

    & > * {
      flex-shrink: 0;
    }
  `};
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

const ResultsMeta = styled(Text)<{ $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 28px 0 6px;
  font-size: 13px;
  color: ${s("textTertiary")};
  transition: opacity 100ms ease-out;

  ${breakpoint("mobile", "tablet")`
    margin: 12px 0 4px;
  `}

  ${(props) =>
    props.$disabled &&
    `
      opacity: 0.8;
      pointer-events: none;
    `}
`;

const EMPTY_VALUES: string[] = [];

export default observer(Search);
