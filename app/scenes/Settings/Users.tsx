import type { ColumnSort } from "@tanstack/react-table";
import { observer } from "mobx-react";
import type * as React from "react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import { breakpoint } from "@shared/styles/breakpoint";
import type { Filter } from "@shared/helpers/FilterHelper";
import type UsersStore from "~/stores/UsersStore";
import { queriedUsers } from "~/stores/UsersStore";
import { ConditionalFade } from "~/components/Fade";
import InputSearch from "~/components/InputSearch";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { useTableRequest } from "~/hooks/useTableRequest";
import { ExportCSV } from "./components/ExportCSV";
import { UsersTable } from "./components/UsersTable";
import { StickyFilters } from "./components/StickyFilters";
import UserRoleFilter from "./components/UserRoleFilter";
import UserStatusFilter from "./components/UserStatusFilter";
import { HStack } from "~/components/primitives/HStack";

function UsersPanel() {
  const location = useLocation();
  const history = useHistory();
  const team = useCurrentTeam();
  const { users } = useStores();
  const { t } = useTranslation();
  const params = useQuery();
  const can = usePolicy(team);
  const [query, setQuery] = useState("");

  const status = params.get("filter") || "active";
  const role = params.get("role") || undefined;

  const reqParams = useMemo(
    () => ({
      query: params.get("query") || undefined,
      filters: getUserFilters({ status, role }),
      sort: params.get("sort") || "name",
      direction: (params.get("direction") || "asc").toUpperCase() as
        | "ASC"
        | "DESC",
    }),
    [params, status, role]
  );

  const sort: ColumnSort = useMemo(
    () => ({
      id: reqParams.sort,
      desc: reqParams.direction === "DESC",
    }),
    [reqParams.sort, reqParams.direction]
  );

  const { data, error, loading, next } = useTableRequest({
    data: getFilteredUsers({
      users,
      query: reqParams.query,
      filter: status,
      role,
    }),
    sort,
    reqFn: users.fetchPage,
    reqParams,
  });

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

  const handleStatusFilter = useCallback(
    (status: string) => updateParams("filter", status),
    [updateParams]
  );

  const handleRoleFilter = useCallback(
    (role: string) => updateParams("role", role),
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
      toast.error(t("Could not load users"));
    }
  }, [t, error]);

  useEffect(() => {
    const timeout = setTimeout(() => updateParams("query", query), 250);
    return () => clearTimeout(timeout);
  }, [query, updateParams]);

  const admins = (data ?? []).filter((user) => user.isAdmin).length;

  return (
    <>
      <StickyFilters justify="space-between">
        <FilterGroup>
          <InputSearch
            short
            value={query}
            placeholder={`${t("Filter members")}…`}
            onChange={handleSearch}
          />
          <LargeUserStatusFilter
            activeKey={status}
            onSelect={handleStatusFilter}
          />
          <LargeUserRoleFilter
            activeKey={role ?? ""}
            onSelect={handleRoleFilter}
          />
        </FilterGroup>
        <HStack spacing={12}>
          <Count>
            {t("{{ count }} member", { count: (data ?? []).length })}
            {" · "}
            {t("{{ count }} admin", { count: admins })}
          </Count>
          <ExportCSV reqParams={reqParams} />
        </HStack>
      </StickyFilters>
      <ConditionalFade animate={!data}>
        <UsersTable
          data={data ?? []}
          sort={sort}
          canManage={can.update}
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

function getUserFilters({
  status,
  role,
}: {
  status: string;
  role?: string;
}): Filter[] {
  const filters: Filter[] = [];

  if (role) {
    filters.push({ field: "role", operator: "eq", value: role });
  }

  switch (status) {
    case "all":
      // Suspended users are excluded unless the expression references
      // suspendedAt, so match on either state.
      filters.push({
        operator: "OR",
        filters: [
          { field: "suspendedAt", operator: "isNull" },
          { field: "suspendedAt", operator: "isNotNull" },
        ],
      });
      break;
    case "suspended":
      filters.push({ field: "suspendedAt", operator: "isNotNull" });
      break;
    case "invited":
      filters.push({ field: "lastActiveAt", operator: "isNull" });
      break;
    default:
      filters.push(
        { field: "lastActiveAt", operator: "isNotNull" },
        { field: "suspendedAt", operator: "isNull" }
      );
  }

  return filters;
}

function getFilteredUsers({
  users,
  query,
  filter,
  role,
}: {
  users: UsersStore;
  query?: string;
  filter?: string;
  role?: string;
}) {
  let filteredUsers;

  switch (filter) {
    case "all":
      filteredUsers = users.all;
      break;
    case "suspended":
      filteredUsers = users.suspended;
      break;
    case "invited":
      filteredUsers = users.invited;
      break;
    default:
      filteredUsers = users.active;
  }

  if (role) {
    filteredUsers = filteredUsers.filter((user) => user.role === role);
  }

  if (query) {
    filteredUsers = queriedUsers(filteredUsers, query);
  }

  return filteredUsers;
}

const FilterGroup = styled(HStack)`
  ${breakpoint("mobile", "tablet")`
    display: contents;
  `};
`;

const LargeUserStatusFilter = styled(UserStatusFilter)`
  height: 32px;
`;

const LargeUserRoleFilter = styled(UserRoleFilter)`
  height: 32px;
`;

const Count = styled.span`
  font-size: 13px;
  color: ${s("textTertiary")};
  white-space: nowrap;
`;

export default observer(UsersPanel);
