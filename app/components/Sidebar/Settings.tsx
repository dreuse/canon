import { groupBy } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { BackIcon } from "outline-icons";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import Flex from "~/components/Flex";
import InputSearch from "~/components/InputSearch";
import Scrollable from "~/components/Scrollable";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import isCloudHosted from "~/utils/isCloudHosted";
import { settingsPath } from "~/utils/routeHelpers";
import { VoHelpIcon } from "~/components/Icons/VobysIcons";
import HelpMenu from "~/menus/HelpMenu";
import NotificationIcon from "../Notifications/NotificationIcon";
import NotificationsPopover from "../Notifications/NotificationsPopover";
import Sidebar from "./Sidebar";
import Header from "./components/Header";
import HistoryNavigation from "./components/HistoryNavigation";
import Section from "./components/Section";
import SidebarButton from "./components/SidebarButton";
import SidebarLink from "./components/SidebarLink";
import Version from "./components/Version";

function SettingsSidebar() {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const configs = useSettingsConfig();
  const [query, setQuery] = useState("");

  const handleQuery = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    []
  );

  const term = query.trim().toLowerCase();
  const groupedConfig = groupBy(
    configs.filter(
      (item) =>
        item.nav !== false &&
        (!term ||
          item.name.toLowerCase().includes(term) ||
          (item.description ?? "").toLowerCase().includes(term))
    ),
    "group"
  );

  const returnToApp = useCallback(() => {
    history.push("/home");
  }, [history]);

  return (
    <Sidebar
      canCollapse={false}
      accountActions={
        <>
          <HelpMenu>
            <SidebarButton
              position="bottom"
              image={<VoHelpIcon />}
              aria-label={t("Help")}
              style={{ paddingInline: 4 }}
            />
          </HelpMenu>
          <NotificationsPopover>
            <SidebarButton
              position="bottom"
              image={<NotificationIcon />}
              aria-label={t("Notifications")}
              style={{ paddingInline: 4 }}
            />
          </NotificationsPopover>
        </>
      }
    >
      <SidebarButton
        title={t("Return to App")}
        image={<StyledBackIcon />}
        onClick={returnToApp}
      />

      <Search>
        <InputSearch
          value={query}
          placeholder={`${t("Search settings")}…`}
          onChange={handleQuery}
        />
      </Search>

      <Flex auto column>
        <Scrollable shadow>
          {Object.keys(groupedConfig).map((header) => (
            <Section key={header}>
              <Header title={header}>
                {groupedConfig[header].map((item) => (
                  <SidebarLink
                    key={item.path}
                    to={item.path}
                    onClickIntent={item.preload}
                    active={
                      item.path.startsWith(settingsPath("templates")) ||
                      item.path.startsWith(settingsPath("groups"))
                        ? location.pathname.startsWith(item.path)
                        : undefined
                    }
                    label={item.name}
                  />
                ))}
              </Header>
            </Section>
          ))}
          {!isCloudHosted && (
            <Section>
              <Header title={t("Installation")} />
              <Version />
            </Section>
          )}
        </Scrollable>
      </Flex>
      <HistoryNavigation />
    </Sidebar>
  );
}

const Search = styled.div`
  padding: 0 8px 12px;

  > * {
    width: 100%;
    max-width: 100%;
  }
`;

const StyledBackIcon = styled(BackIcon)`
  margin-inline-start: 4px;

  [dir="rtl"] & {
    transform: rotate(180deg);
  }
`;

export default observer(SettingsSidebar);
