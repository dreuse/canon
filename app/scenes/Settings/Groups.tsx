import type { ColumnSort } from "@tanstack/react-table";
import { deburr } from "es-toolkit/compat";
import { observer } from "mobx-react";
import * as React from "react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import type Group from "~/models/Group";
import Empty from "~/components/Empty";
import { ConditionalFade } from "~/components/Fade";
import styled from "styled-components";
import InputSearch from "~/components/InputSearch";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { useTableRequest } from "~/hooks/useTableRequest";
import GroupSourceFilter from "./components/GroupSourceFilter";
import { GroupsTable } from "./components/GroupsTable";
import { StickyFilters } from "./components/StickyFilters";

function getFilteredGroups(groups: Group[], query?: string, source?: string) {
  let filtered = groups;

  if (query?.length) {
    const normalizedQuery = deburr(query.toLocaleLowerCase());
    filtered = filtered.filter((group) =>
      deburr(group.name).toLocaleLowerCase().includes(normalizedQuery)
    );
  }

  if (source === "manual") {
    filtered = filtered.filter((group) => !group.externalGroup);
  } else if (source) {
    filtered = filtered.filter(
      (group) => group.externalGroup?.provider === source
    );
  }

  return filtered;
}

function GroupsPanel() {
  const { t } = useTranslation();
  const { groups } = useStores();
  const history = useHistory();
  const location = useLocation();
  const params = useQuery();
  const [query, setQuery] = useState("");

  const reqParams = useMemo(
    () => ({
      query: params.get("query") || undefined,
      source: params.get("source") || undefined,
      sort: params.get("sort") || "name",
      direction: (params.get("direction") || "asc").toUpperCase() as
        | "ASC"
        | "DESC",
    }),
    [params]
  );

  const sort: ColumnSort = useMemo(
    () => ({
      id: reqParams.sort,
      desc: reqParams.direction === "DESC",
    }),
    [reqParams.sort, reqParams.direction]
  );

  const { data, error, loading, next } = useTableRequest({
    data: getFilteredGroups(
      groups.orderedData,
      reqParams.query,
      reqParams.source
    ),
    sort,
    reqFn: groups.fetchPage,
    reqParams,
  });

  const isEmpty = !loading && !groups.orderedData.length;

  const updateParams = useCallback(
    (name: string, value: string) => {
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }

      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });
    },
    [params, history, location.pathname]
  );

  const handleSourceFilter = useCallback(
    (source: string | null | undefined) => updateParams("source", source ?? ""),
    [updateParams]
  );

  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setQuery(value);
    },
    []
  );

  useEffect(() => {
    if (error) {
      toast.error(t("Could not load groups"));
    }
  }, [t, error]);

  useEffect(() => {
    const timeout = setTimeout(() => updateParams("query", query), 250);
    return () => clearTimeout(timeout);
  }, [query, updateParams]);

  if (isEmpty) {
    return <Empty>{t("No groups have been created yet")}</Empty>;
  }

  return (
    <>
      <StickyFilters>
        <InputSearch
          short
          value={query}
          placeholder={`${t("Filter")}…`}
          onChange={handleSearch}
        />
        <LargeGroupSourceFilter
          activeKey={reqParams.source ?? ""}
          onSelect={handleSourceFilter}
        />
      </StickyFilters>
      <ConditionalFade animate={!data}>
        <GroupsTable
          data={data ?? []}
          sort={sort}
          loading={loading}
          page={{
            hasNext: !!next,
            fetchNext: next,
          }}
        />
      </ConditionalFade>
    </>
  );
}

const LargeGroupSourceFilter = styled(GroupSourceFilter)`
  height: 32px;
`;

export default observer(GroupsPanel);
