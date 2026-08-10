import { groupBy } from "es-toolkit/compat";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import InputSearch from "~/components/InputSearch";
import Scene from "~/components/Scene";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import useStores from "~/hooks/useStores";
import IntegrationCard, { Card } from "./components/IntegrationCard";
import { StickyFilters } from "./components/StickyFilters";
import { observer } from "mobx-react";

import { SettingsTitle } from "./components/SettingsTitle";

function Integrations() {
  const { t } = useTranslation();
  const { integrations } = useStores();
  const items = useSettingsConfig();
  const [query, setQuery] = React.useState("");

  const handleQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const groupedItems = groupBy(
    items.filter(
      (item) =>
        item.group === t("Connections") &&
        item.nav === false &&
        item.enabled &&
        item.name.toLowerCase().includes(query.toLowerCase())
    ),
    (item) =>
      item.pluginId && integrations.findByService(item.pluginId)
        ? "connected"
        : "available"
  );

  return (
    <Scene title={t("Integrations")}>
      <SettingsTitle title={t("Integrations")}>
        <Trans>
          Configure a variety of integrations with third-party services.
        </Trans>
      </SettingsTitle>
      <StickyFilters>
        <InputSearch
          short
          value={query}
          placeholder={`${t("Filter")}…`}
          onChange={handleQuery}
        />
      </StickyFilters>

      <Cards gap={30} wrap>
        {groupedItems.connected?.map((item) => (
          <IntegrationCard key={item.path} integration={item} isConnected />
        ))}
        {groupedItems.available?.map((item) => (
          <IntegrationCard key={item.path} integration={item} />
        ))}
        {groupedItems.available?.length % 2 === 1 && (
          <Card style={{ visibility: "hidden" }} />
        )}
      </Cards>
    </Scene>
  );
}

const Cards = styled(Flex)`
  margin-top: 20px;
  width: "100%";
`;

export default observer(Integrations);
