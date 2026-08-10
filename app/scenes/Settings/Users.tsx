import type { ColumnSort } from "@tanstack/react-table";
import { observer } from "mobx-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
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

  const reqParams = useMemo(
    () => ({
      query: params.get("query") || undefined,
      filter: params.get("filter") || "active",
      role: params.get("role") || undefined,
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
    data: getFilteredUsers({
      users,
      query: reqParams.query,
      filter: reqParams.filter,
      role: reqParams.role,
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
    (status) => updateParams("filter", status),
    [updateParams]
  );

  const handleRoleFilter = useCallback(
    (role) => updateParams("role", role),
    [updateParams]
  );

  const handleSearch = useCallback((event) => {
    const { value } = event.target;
    setQuery(value);
  }, []);

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
        <HStack>
          <InputSearch
            short
            value={query}
            placeholder={`${t("Filter members")}…`}
            onChange={handleSearch}
          />
          <LargeUserStatusFilter
            activeKey={reqParams.filter ?? ""}
            onSelect={handleStatusFilter}
          />
          <LargeUserRoleFilter
            activeKey={reqParams.role ?? ""}
            onSelect={handleRoleFilter}
          />
        </HStack>
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
