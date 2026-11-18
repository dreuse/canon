import { useKBar } from "kbar";
import { observer } from "mobx-react";
import { SettingsIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import { sidebarPanelWidth, sidebarRailWidth } from "@shared/styles/theme";
import { metaDisplay, shortcutSeparator } from "@shared/utils/keyboard";
import { createCollection } from "~/actions/definitions/collections";
import { navigateToImport } from "~/actions/definitions/navigation";
import { rootTeamActions } from "~/actions/definitions/teams";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { DialogTitle } from "~/components/DialogTitle";
import { useDropRef } from "~/components/DragAndDrop";
import {
  VoArchiveIcon,
  VoBellIcon,
  VoCollectionIcon,
  VoDraftsIcon,
  VoHomeIcon,
  VoPlusIcon,
  VoSearchIcon,
  VoStarredIcon,
  VoTemplateIcon,
  VoTrashIcon,
} from "~/components/Icons/VobysIcons";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import NotificationsPopover from "~/components/Notifications/NotificationsPopover";
import NudeButton from "~/components/NudeButton";
import { MenuLabel } from "~/components/primitives/Menu";
import Scrollable from "~/components/Scrollable";
import TeamLogo from "~/components/TeamLogo";
import Tooltip from "~/components/Tooltip";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useMenuAction } from "~/hooks/useMenuAction";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import AccountMenu from "~/menus/AccountMenu";
import * as Scenes from "~/routes/scenes";
import DocumentDelete from "~/scenes/DocumentDelete";
import { undraggableOnDesktop } from "~/styles";
import {
  archivePath,
  draftsPath,
  homePath,
  settingsPath,
  trashPath,
} from "~/utils/routeHelpers";
import Collections from "./components/Collections";
import { DismissableSidebarAction } from "./components/DismissableSidebarAction";
import { SidebarScrollProvider } from "./components/DragActiveContext";
import NavLink from "./components/NavLink";
import { PersonalDocs } from "./components/PersonalDocs";
import SharedWithMe from "./components/SharedWithMe";
import SidebarContext from "./components/SidebarContext";
import SidebarLink from "./components/SidebarLink";
import { SidebarNavigationProvider } from "./components/SidebarNavigation";
import Starred from "./components/Starred";
import {
  type DragObject,
  useDropToArchive,
  useDropToUnpublish,
} from "./hooks/useDragAndDrop";

const ICON_SIZE = 20;
const PLUS_ICON_SIZE = 16;
const TEAM_LOGO_SIZE = AvatarSize.Large;
const HOME_SHORTCUT = "d";
const RAIL_BUTTON_SIZE = 36;
const RAIL_GAP = 4;
const RAIL_PADDING_BLOCK = 10;
const SEPARATOR_WIDTH = 24;
const DOT_SIZE = 7;
const DOT_OFFSET = 7;
const PANEL_ROW_INSET = 8;
const PANEL_HEADER_PADDING_START = 16;
const PANEL_HEADER_PADDING_END = 12;
const PANEL_HEADER_HEIGHT = 36;

/** The panels that the rail can show beside its buttons. */
export type RailPanelId = "collections" | "starred";

interface RailProps {
  panel: RailPanelId;
  onPanelChange: (panel: RailPanelId) => void;
}

/**
 * The icon rail at the start of the app sidebar. Its buttons navigate or
 * swap the panel that is shown beside it.
 */
export const Rail = observer(function Rail({
  panel,
  onPanelChange,
}: RailProps) {
  const { t } = useTranslation();
  const { notifications } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const can = usePolicy(team.id);
  const { query } = useKBar();
  const workspaceMenu = useMenuAction(rootTeamActions);
  const [{ isOver: isOverDrafts, canDrop: canDropDrafts }, dropToUnpublishRef] =
    useDropToUnpublish();

  const handleSearch = React.useCallback(() => {
    query.toggle();
  }, [query]);

  const handleShowCollections = React.useCallback(() => {
    onPanelChange("collections");
  }, [onPanelChange]);

  const handleShowStarred = React.useCallback(() => {
    onPanelChange("starred");
  }, [onPanelChange]);

  const unread = notifications.approximateUnreadCount;
  const searchLabel = t("Search ({{ shortcut }})", {
    shortcut: `${metaDisplay}${shortcutSeparator}K`,
  });

  return (
    <Nav aria-label={t("Main navigation")}>
      <Tooltip content={team.name} side="right">
        <Trigger>
          <DropdownMenu
            action={workspaceMenu}
            ariaLabel={t("Workspace")}
            prepend={<MenuLabel>{team.name}</MenuLabel>}
          >
            <WorkspaceButton
              aria-label={t("{{ name }}, switch workspace", {
                name: team.name,
              })}
            >
              <TeamLogo model={team} size={TEAM_LOGO_SIZE} alt="" />
            </WorkspaceButton>
          </DropdownMenu>
        </Trigger>
      </Tooltip>

      <Tooltip content={searchLabel} side="right">
        <Trigger>
          <RailButton aria-label={searchLabel} onClick={handleSearch}>
            <VoSearchIcon size={ICON_SIZE} />
          </RailButton>
        </Trigger>
      </Tooltip>

      <Tooltip content={t("Home")} shortcut={HOME_SHORTCUT} side="right">
        <Trigger>
          <RailLink
            to={homePath()}
            exact={false}
            aria-label={t("Home")}
            onPointerEnter={Scenes.Home.preload}
          >
            <VoHomeIcon size={ICON_SIZE} />
          </RailLink>
        </Trigger>
      </Tooltip>

      <Tooltip content={t("Notifications")} side="right">
        <Trigger>
          <NotificationsPopover>
            <RailButton
              aria-label={
                unread > 0
                  ? t("Notifications, {{ count }} new", { count: unread })
                  : t("Notifications")
              }
            >
              <VoBellIcon size={ICON_SIZE} />
              {unread > 0 && <Dot />}
            </RailButton>
          </NotificationsPopover>
        </Trigger>
      </Tooltip>

      {can.createDocument && (
        <Tooltip content={t("Drafts")} side="right">
          <Trigger ref={dropToUnpublishRef}>
            <RailLink
              to={draftsPath()}
              aria-label={t("Drafts")}
              $isActiveDrop={isOverDrafts && canDropDrafts}
              onPointerEnter={Scenes.Drafts.preload}
            >
              <VoDraftsIcon size={ICON_SIZE} />
            </RailLink>
          </Trigger>
        </Tooltip>
      )}

      {can.readTemplate && (
        <Tooltip content={t("Templates")} side="right">
          <Trigger>
            <RailLink
              to={settingsPath("templates")}
              aria-label={t("Templates")}
            >
              <VoTemplateIcon size={ICON_SIZE} />
            </RailLink>
          </Trigger>
        </Tooltip>
      )}

      <Separator aria-hidden />

      <Tooltip content={t("Collections")} side="right">
        <Trigger>
          <RailButton
            aria-label={t("Collections")}
            aria-pressed={panel === "collections"}
            onClick={handleShowCollections}
          >
            <VoCollectionIcon size={ICON_SIZE} />
          </RailButton>
        </Trigger>
      </Tooltip>

      <Tooltip content={t("Starred")} side="right">
        <Trigger>
          <RailButton
            aria-label={t("Starred")}
            aria-pressed={panel === "starred"}
            onClick={handleShowStarred}
          >
            <VoStarredIcon size={ICON_SIZE} />
          </RailButton>
        </Trigger>
      </Tooltip>

      <End>
        {can.update && (
          <Tooltip content={t("Settings")} side="right">
            <Trigger>
              <RailLink
                to={settingsPath()}
                exact={false}
                aria-label={t("Settings")}
              >
                <SettingsIcon size={ICON_SIZE} />
              </RailLink>
            </Trigger>
          </Tooltip>
        )}

        <Tooltip content={t("Account")} side="right">
          <Trigger>
            <AccountMenu>
              <RailButton
                aria-label={t("{{ name }}, account", { name: user.name })}
              >
                <Avatar
                  alt=""
                  model={user}
                  size={AvatarSize.Medium}
                  showHoverCard={false}
                />
              </RailButton>
            </AccountMenu>
          </Trigger>
        </Tooltip>
      </End>
    </Nav>
  );
});

interface RailPanelProps {
  panel: RailPanelId;
}

/**
 * The 240px panel beside the icon rail, showing the content of the pressed
 * rail button.
 */
export const RailPanel = observer(function RailPanel({
  panel,
}: RailPanelProps) {
  const { t } = useTranslation();
  const headingId = React.useId();
  const [scrollArea, setScrollArea] = React.useState<HTMLElement | null>(null);

  if (panel === "starred") {
    return (
      <Panel aria-label={t("Starred")}>
        <Scrollable flex shadow ref={setScrollArea}>
          <SidebarScrollProvider value={scrollArea}>
            <Starred />
          </SidebarScrollProvider>
        </Scrollable>
      </Panel>
    );
  }

  return (
    <Panel aria-label={t("Collections")}>
      <PanelHeader>
        <PanelTitle id={headingId}>{t("Collections")}</PanelTitle>
        <NudeButton
          action={createCollection}
          hideOnActionDisabled
          aria-label={t("New collection")}
          tooltip={{ content: t("New collection"), side: "right" }}
        >
          <VoPlusIcon size={PLUS_ICON_SIZE} />
        </NudeButton>
      </PanelHeader>
      <Scrollable flex shadow ref={setScrollArea}>
        <SidebarScrollProvider value={scrollArea}>
          <SidebarNavigationProvider>
            <div role="group" aria-labelledby={headingId}>
              <Collections />
              <PersonalDocs />
            </div>
            <SharedWithMe />
          </SidebarNavigationProvider>
          <div>
            <DismissableSidebarAction
              id="sidebar-import-hidden"
              action={navigateToImport}
            />
          </div>
        </SidebarScrollProvider>
      </Scrollable>
      <PanelFooter />
    </Panel>
  );
});

const PanelFooter = observer(function PanelFooter() {
  const { t } = useTranslation();
  const { documents, policies, dialogs } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team.id);

  const [{ isOverArchiveSection, isDragging }, dropToArchiveRef] =
    useDropToArchive();

  const [{ isDocumentDropping }, dropToTrashRef] = useDropRef({
    accept: "document",
    drop: async (item: DragObject) => {
      const document = documents.get(item.id);
      if (!document) {
        return;
      }

      dialogs.openModal({
        title: (
          <DialogTitle
            title={t("Delete {{ documentName }}", {
              documentName: document.noun,
            })}
            model={document}
          />
        ),
        content: (
          <DocumentDelete
            document={document}
            onSubmit={dialogs.closeAllModals}
          />
        ),
      });
    },
    canDrop: (item) => policies.abilities(item.id).delete,
    collect: (monitor) => ({
      isDocumentDropping: monitor.isOver(),
    }),
  });

  if (!can.createDocument) {
    return null;
  }

  return (
    <Footer role="group" aria-label={t("System")}>
      <SidebarContext.Provider value="archive">
        <div ref={dropToArchiveRef}>
          <SidebarLink
            to={archivePath()}
            exact={false}
            icon={<VoArchiveIcon />}
            label={t("Archive")}
            isActiveDrop={isOverArchiveSection && isDragging}
            onPointerEnter={Scenes.Archive.preload}
          />
        </div>
      </SidebarContext.Provider>
      <div ref={dropToTrashRef}>
        <SidebarLink
          to={trashPath()}
          exact={false}
          icon={<VoTrashIcon />}
          label={t("Trash")}
          isActiveDrop={isDocumentDropping}
          isActive={() => !!documents.active?.isDeleted}
          onPointerEnter={Scenes.Trash.preload}
        />
      </div>
    </Footer>
  );
});

const Nav = styled.nav`
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  gap: ${RAIL_GAP}px;
  width: ${sidebarRailWidth}px;
  padding-block: ${RAIL_PADDING_BLOCK}px;
  background: ${s("sidebarBackground")};
  border-inline-end: 1px solid ${s("divider")};
`;

const Trigger = styled.span`
  display: inline-flex;
`;

const buttonStyles = css`
  position: relative;
  display: grid;
  place-items: center;
  width: ${RAIL_BUTTON_SIZE}px;
  height: ${RAIL_BUTTON_SIZE}px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: ${s("sidebarText")};
  cursor: var(--pointer);
  ${undraggableOnDesktop()}

  &:hover {
    background: ${s("sidebarHoverBackground")};
    color: ${s("text")};
  }

  &:focus-visible {
    outline: 2px solid ${s("accent")};
    outline-offset: -2px;
  }

  &[aria-pressed="true"],
  &[aria-current="page"] {
    background: ${s("tableSelectedBackground")};
    color: ${s("link")};
  }
`;

const RailButton = styled.button.attrs({ type: "button" })`
  ${buttonStyles}
`;

const RailLink = styled(NavLink)<{ $isActiveDrop?: boolean }>`
  ${buttonStyles}

  ${(props) =>
    props.$isActiveDrop &&
    css`
      background: ${props.theme.sidebarActiveBackground};
      color: ${props.theme.text};
      box-shadow: inset 0 0 0 1px ${props.theme.accent};
    `}
`;

const WorkspaceButton = styled(RailButton)`
  width: ${TEAM_LOGO_SIZE}px;
  height: ${TEAM_LOGO_SIZE}px;
  margin-bottom: ${RAIL_PADDING_BLOCK}px;
`;

const Dot = styled.span`
  position: absolute;
  top: ${DOT_OFFSET}px;
  inset-inline-end: ${DOT_OFFSET}px;
  width: ${DOT_SIZE}px;
  height: ${DOT_SIZE}px;
  border-radius: 50%;
  background: ${s("link")};
  box-shadow: 0 0 0 2px ${s("sidebarBackground")};
`;

const Separator = styled.span`
  width: ${SEPARATOR_WIDTH}px;
  height: 1px;
  margin-block: 6px;
  background: ${s("divider")};
`;

const End = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${RAIL_GAP}px;
  margin-top: auto;
`;

const Panel = styled.nav`
  display: flex;
  flex: none;
  flex-direction: column;
  width: ${sidebarPanelWidth}px;
  min-height: 0;
  padding-block: ${RAIL_PADDING_BLOCK}px;
  background: ${s("sidebarBackground")};
  border-inline-end: 1px solid ${s("divider")};
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: none;
  height: ${PANEL_HEADER_HEIGHT}px;
  padding-inline: ${PANEL_HEADER_PADDING_START}px ${PANEL_HEADER_PADDING_END}px;
  margin-bottom: 6px;
  color: ${s("textSecondary")};
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  color: ${s("text")};
`;

const Footer = styled.div`
  position: relative;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-top: 8px;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    inset-inline: ${PANEL_ROW_INSET}px;
    height: 1px;
    background: ${s("divider")};
  }
`;
