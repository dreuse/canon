import { useKBar } from "kbar";
import { observer } from "mobx-react";
import { CloseIcon, SettingsIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { MOBILE_TOUCH_TARGET } from "@shared/constants";
import { s } from "@shared/styles";
import { rootTeamActions } from "~/actions/definitions/teams";
import { Avatar, AvatarSize } from "~/components/Avatar";
import {
  VoBellIcon,
  VoDraftsIcon,
  VoHomeIcon,
  VoSearchIcon,
  VoTemplateIcon,
} from "~/components/Icons/VobysIcons";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import NotificationsPopover from "~/components/Notifications/NotificationsPopover";
import NudeButton from "~/components/NudeButton";
import { MenuLabel } from "~/components/primitives/Menu";
import Scrollable from "~/components/Scrollable";
import TeamLogo from "~/components/TeamLogo";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useMenuAction } from "~/hooks/useMenuAction";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import AccountMenu from "~/menus/AccountMenu";
import { undraggableOnDesktop } from "~/styles";
import { draftsPath, homePath, settingsPath } from "~/utils/routeHelpers";
import { PanelFooter } from "./Rail";
import Collections from "./components/Collections";
import { SidebarScrollProvider } from "./components/DragActiveContext";
import NavLink from "./components/NavLink";
import { PersonalDocs } from "./components/PersonalDocs";
import SharedWithMe from "./components/SharedWithMe";
import SidebarLink from "./components/SidebarLink";
import { SidebarNavigationProvider } from "./components/SidebarNavigation";
import Starred from "./components/Starred";

const TEAM_LOGO_SIZE = AvatarSize.Large;
const ICON_SIZE = 20;

/**
 * Navigation shown inside the drawer below the desktop breakpoint, listing the
 * rail destinations and the collections.
 */
export const DrawerNav = observer(function DrawerNav() {
  const { t } = useTranslation();
  const { ui, documents, notifications } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const can = usePolicy(team.id);
  const { query } = useKBar();
  const workspaceMenu = useMenuAction(rootTeamActions);
  const [scrollArea, setScrollArea] = React.useState<HTMLElement | null>(null);

  const handleSearch = React.useCallback(() => {
    ui.hideMobileSidebar();
    query.toggle();
  }, [ui, query]);

  return (
    <Nav aria-label={t("Main navigation")}>
      <Top>
        <DropdownMenu
          action={workspaceMenu}
          ariaLabel={t("Workspace")}
          prepend={<MenuLabel>{team.name}</MenuLabel>}
        >
          <RowButton
            aria-label={t("{{ name }}, switch workspace", { name: team.name })}
          >
            <TeamLogo model={team} size={TEAM_LOGO_SIZE} alt="" />
            {team.name}
          </RowButton>
        </DropdownMenu>
        <CloseButton
          aria-label={t("Close menu")}
          onClick={ui.hideMobileSidebar}
        >
          <CloseIcon size={ICON_SIZE} />
        </CloseButton>
      </Top>
      <SearchField onClick={handleSearch}>
        <VoSearchIcon size={ICON_SIZE} />
        {t("Search")}
      </SearchField>
      <Scrollable flex shadow ref={setScrollArea}>
        <SidebarScrollProvider value={scrollArea}>
          <Destinations>
            <SidebarLink
              to={homePath()}
              exact={false}
              icon={<VoHomeIcon />}
              label={t("Home")}
            />
            <NotificationsPopover>
              <SidebarLink
                icon={<VoBellIcon />}
                label={t("Notifications")}
                count={notifications.approximateUnreadCount}
              />
            </NotificationsPopover>
            {can.createDocument && (
              <SidebarLink
                to={draftsPath()}
                icon={<VoDraftsIcon />}
                label={t("Drafts")}
                count={documents.totalDrafts}
              />
            )}
            {can.readTemplate && (
              <SidebarLink
                to={settingsPath("templates")}
                icon={<VoTemplateIcon />}
                label={t("Templates")}
              />
            )}
          </Destinations>
          <Starred />
          <SidebarNavigationProvider>
            <div role="group" aria-label={t("Collections")}>
              <SectionTitle>{t("Collections")}</SectionTitle>
              <Collections />
              <PersonalDocs />
            </div>
            <SharedWithMe />
          </SidebarNavigationProvider>
        </SidebarScrollProvider>
      </Scrollable>
      <PanelFooter />
      <Account>
        <AccountMenu>
          <RowButton aria-label={t("{{ name }}, account", { name: user.name })}>
            <Avatar
              alt=""
              model={user}
              size={AvatarSize.Medium}
              showHoverCard={false}
            />
            {user.name}
          </RowButton>
        </AccountMenu>
        {can.update && (
          <SettingsLink
            to={settingsPath()}
            exact={false}
            aria-label={t("Settings")}
          >
            <SettingsIcon size={ICON_SIZE} />
          </SettingsLink>
        )}
      </Account>
    </Nav>
  );
});

const Nav = styled.nav`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding-block: 12px;

  a:not(:is(a, button) *),
  button:not(:is(a, button) *) {
    align-items: center;
    min-height: ${MOBILE_TOUCH_TARGET}px;
  }
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: 16px 8px;
  margin-bottom: 12px;
`;

const RowButton = styled.button.attrs({ type: "button" })`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 600;
  cursor: var(--pointer);
  ${undraggableOnDesktop()}
`;

const CloseButton = styled(NudeButton)`
  width: ${MOBILE_TOUCH_TARGET}px;
  height: ${MOBILE_TOUCH_TARGET}px;
  display: grid;
  place-items: center;
  color: ${s("textSecondary")};
`;

const SearchField = styled(RowButton)`
  margin: 0 16px 8px;
  padding: 0 12px;
  border: 1px solid ${s("inputBorder")};
  border-radius: 8px;
  font-weight: 400;
  color: ${s("textTertiary")};
`;

const Destinations = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const SectionTitle = styled.h2`
  margin: 16px 0 4px;
  padding-inline: 16px;
  font-size: 13px;
  font-weight: 500;
  color: ${s("textTertiary")};
`;

const Account = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: 16px 8px;
`;

const SettingsLink = styled(NavLink)`
  display: grid;
  place-items: center;
  width: ${MOBILE_TOUCH_TARGET}px;
  color: ${s("textSecondary")};
`;
