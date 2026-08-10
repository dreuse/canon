import { observer } from "mobx-react";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import DocumentDelete from "~/scenes/DocumentDelete";
import { DialogTitle } from "~/components/DialogTitle";
import Tooltip from "~/components/Tooltip";
import {
  VoArchiveIcon,
  VoBellIcon,
  VoDraftsIcon,
  VoHelpIcon,
  VoHomeIcon,
  VoTemplateIcon,
  VoTrashIcon,
} from "~/components/Icons/VobysIcons";
import HelpMenu from "~/menus/HelpMenu";
import NotificationsPopover from "~/components/Notifications/NotificationsPopover";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import * as Scenes from "~/routes/scenes";
import {
  archivePath,
  draftsPath,
  homePath,
  settingsPath,
  trashPath,
} from "~/utils/routeHelpers";
import type { DragObject } from "../hooks/useDragAndDrop";
import { useDropToArchive, useDropToUnpublish } from "../hooks/useDragAndDrop";
import NavLink from "./NavLink";
import SidebarContext from "./SidebarContext";
import SidebarLink from "./SidebarLink";

const DRAFT_COUNT_LIMIT = 25;

function SidebarNav() {
  const { t } = useTranslation();
  const { documents } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team.id);

  const [{ isOver: isOverDrafts, canDrop: canDropDrafts }, dropToUnpublishRef] =
    useDropToUnpublish();

  const draftCount = documents.totalDrafts;

  return (
    <Nav aria-label={t("Navigation")}>
      <SidebarLink
        to={homePath()}
        exact={false}
        icon={<VoHomeIcon />}
        label={t("Home")}
        onPointerEnter={Scenes.Home.preload}
      />
      {can.createDocument && (
        <div ref={dropToUnpublishRef}>
          <SidebarLink
            to={draftsPath()}
            icon={<VoDraftsIcon />}
            label={t("Drafts")}
            isActiveDrop={isOverDrafts && canDropDrafts}
            trailing={
              draftCount > 0 ? (
                <Pill>
                  {draftCount > DRAFT_COUNT_LIMIT
                    ? `${DRAFT_COUNT_LIMIT}+`
                    : draftCount}
                </Pill>
              ) : undefined
            }
            onPointerEnter={Scenes.Drafts.preload}
          />
        </div>
      )}
      {can.readTemplate && (
        <SidebarLink
          to={settingsPath("templates")}
          icon={<VoTemplateIcon />}
          label={t("Templates")}
        />
      )}
    </Nav>
  );
}

function SidebarSystemNav() {
  const { t } = useTranslation();
  const { documents, policies, dialogs, notifications } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team.id);

  const [{ isOverArchiveSection, isDragging }, dropToArchiveRef] =
    useDropToArchive();

  const [{ isDocumentDropping }, dropToTrashRef] = useDrop({
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

  return (
    <System aria-label={t("System")}>
      {can.createDocument && (
        <SidebarContext.Provider value="archive">
          <NavItem
            to={archivePath()}
            label={t("Archive")}
            icon={<VoArchiveIcon />}
            exact={false}
            dropRef={dropToArchiveRef}
            isActiveDrop={isOverArchiveSection && isDragging}
            onPointerEnter={Scenes.Archive.preload}
          />
        </SidebarContext.Provider>
      )}
      {can.createDocument && (
        <NavItem
          to={trashPath()}
          label={t("Trash")}
          icon={<VoTrashIcon />}
          exact={false}
          dropRef={dropToTrashRef}
          isActiveDrop={isDocumentDropping}
          isActive={() => !!documents.active?.isDeleted}
          onPointerEnter={Scenes.Trash.preload}
        />
      )}
      <Tooltip content={t("Notifications")} placement="top" delay={300}>
        <Trigger>
          <NotificationsPopover>
            <IconButton aria-label={t("Notifications")}>
              <VoBellIcon />
              {notifications.approximateUnreadCount > 0 && <Dot />}
            </IconButton>
          </NotificationsPopover>
        </Trigger>
      </Tooltip>
      <Tooltip content={t("Help")} placement="top" delay={300}>
        <Trigger>
          <HelpMenu>
            <IconButton aria-label={t("Help")}>
              <VoHelpIcon />
            </IconButton>
          </HelpMenu>
        </Trigger>
      </Tooltip>
    </System>
  );
}

type NavItemProps = {
  to: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  isActiveDrop?: boolean;
  isActive?: () => boolean;
  dropRef?: React.Ref<HTMLDivElement>;
  onPointerEnter?: () => void;
};

function NavItem({
  to,
  label,
  icon,
  exact,
  isActiveDrop,
  isActive,
  dropRef,
  onPointerEnter,
}: NavItemProps) {
  return (
    <div ref={dropRef}>
      <Tooltip content={label} placement="top" delay={300}>
        <Trigger>
          <Item
            to={to}
            exact={exact}
            aria-label={label}
            $isActiveDrop={isActiveDrop}
            isActive={isActive ? (match) => !!match || isActive() : undefined}
            onPointerEnter={onPointerEnter}
          >
            {icon}
          </Item>
        </Trigger>
      </Tooltip>
    </div>
  );
}

const Trigger = styled.span`
  display: inline-flex;
`;

const System = styled.nav`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding-inline-end: 12px;
`;

const Pill = styled.span`
  flex-shrink: 0;
  align-self: center;
  margin-inline-start: 8px;
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 11.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: ${s("accent")};
  background: ${s("sidebarActiveBackground")};
`;

const itemStyles = css`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  padding: 0;
  background: none;
  border-radius: 6px;
  color: ${s("sidebarText")};
  cursor: var(--pointer);
  transition:
    background 100ms ease,
    color 100ms ease;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: ${s("sidebarHoverBackground")};
    color: ${s("text")};
  }
`;

const IconButton = styled.button`
  ${itemStyles}
`;

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid ${s("divider")};
`;

const Dot = styled.span`
  position: absolute;
  top: 4px;
  inset-inline-end: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${s("accent")};
  box-shadow: 0 0 0 2px ${s("sidebarBackground")};
`;

const Item = styled(NavLink)<{ $isActiveDrop?: boolean }>`
  ${itemStyles}

  &.active {
    background: ${s("sidebarActiveBackground")};
    color: ${s("text")};
  }

  ${(props) =>
    props.$isActiveDrop &&
    css`
      background: ${props.theme.sidebarActiveBackground};
      color: ${props.theme.text};
      box-shadow: inset 0 0 0 1px ${props.theme.accent};
    `}
`;

export const SidebarSystemActions = observer(SidebarSystemNav);

export default observer(SidebarNav);
