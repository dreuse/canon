import type { ColumnSort } from "@tanstack/react-table";
import { deburr } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { ShapesIcon } from "outline-icons";
import { useEffect, useMemo, useCallback, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import type Template from "~/models/Template";
import Empty from "~/components/Empty";
import { ConditionalFade } from "~/components/Fade";
import InputSearch from "~/components/InputSearch";
import Scene from "~/components/Scene";
import NewTemplateMenu from "~/menus/NewTemplateMenu";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { useTableRequest } from "~/hooks/useTableRequest";
import { StickyFilters } from "./components/StickyFilters";
import { TemplatesTable } from "./components/TemplatesTable";

import { SettingsTitle } from "./components/SettingsTitle";

function getFilteredTemplates(templates: Template[], query?: string) {
  if (!query?.length) {
    return templates;
  }

  const normalizedQuery = deburr(query.toLocaleLowerCase());
  return templates.filter((template) =>
    deburr(template.title).toLocaleLowerCase().includes(normalizedQuery)
  );
}

function Templates() {
  const { t } = useTranslation();
  const { templates } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const history = useHistory();
  const location = useLocation();
  const params = useQuery();
  const [query, setQuery] = useState("");

  const reqParams = useMemo(
    () => ({
      query: params.get("query") || undefined,
      sort: params.get("sort") || "createdAt",
      direction: (params.get("direction") || "desc").toUpperCase() as
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
    data: getFilteredTemplates(templates.all, reqParams.query),
    sort,
    reqFn: templates.fetchPage,
    reqParams,
  });

  const isEmpty = !loading && !templates.all.length;

  const updateQuery = useCallback(
    (value: string) => {
      if (value) {
        params.set("query", value);
      } else {
        params.delete("query");
      }

      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });
    },
    [params, history, location.pathname]
  );

  const handleSearch = useCallback((event) => {
    const { value } = event.target;
    setQuery(value);
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(t("Could not load templates"));
    }
  }, [t, error]);

  useEffect(() => {
    const timeout = setTimeout(() => updateQuery(query), 250);
    return () => clearTimeout(timeout);
  }, [query, updateQuery]);

  return (
    <Scene title={t("Templates")} icon={<ShapesIcon />} measure="full">
      <SettingsTitle
        title={t("Templates")}
        actions={can.readTemplate ? <NewTemplateMenu /> : null}
      >
        <Trans>
          Templates help your team create consistent and accurate documentation.
        </Trans>
      </SettingsTitle>
      {isEmpty ? (
        <Empty>{t("No templates have been created yet")}</Empty>
      ) : (
        <>
          <StickyFilters>
            <InputSearch
              value={query}
              placeholder={`${t("Filter")}…`}
              onChange={handleSearch}
            />
          </StickyFilters>
          <ConditionalFade animate={!data}>
            <TemplatesTable
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
      )}
    </Scene>
  );
}

export default observer(Templates);
