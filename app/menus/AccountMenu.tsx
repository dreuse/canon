import { observer } from "mobx-react";
import { LogoutIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import {
  navigateToWorkspaceSettings,
  openKeyboardShortcuts,
} from "~/actions/definitions/navigation";
import { inviteUser } from "~/actions/definitions/users";
import { changeTheme } from "~/actions/definitions/settings";
import { ActionSeparator } from "~/actions";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { MenuButton, MenuSeparator } from "~/components/primitives/Menu";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useMenuAction } from "~/hooks/useMenuAction";
import useStores from "~/hooks/useStores";

const MENU_MIN_WIDTH = 280;

type Props = {
  children?: React.ReactNode;
};

const AccountMenu: React.FC = ({ children }: Props) => {
  const { t } = useTranslation();
  const { auth } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();

  const actions = React.useMemo(
    () => [
      navigateToWorkspaceSettings,
      inviteUser,
      ActionSeparator,
      openKeyboardShortcuts,
      changeTheme,
    ],
    []
  );

  const rootAction = useMenuAction(actions);

  const handleLogout = React.useCallback(() => {
    void auth.logout({ userInitiated: true, clearCache: true });
  }, [auth]);

  const header = (
    <>
      <Identity>
        <Avatar model={team} size={AvatarSize.Large} />
        <IdentityText>
          <WorkspaceName>{team.name}</WorkspaceName>
          <Subtitle>{user.email}</Subtitle>
        </IdentityText>
      </Identity>
      <MenuSeparator />
    </>
  );

  const footer = (
    <>
      <MenuSeparator />
      <MenuButton
        label={t("Log out")}
        icon={<LogoutIcon />}
        onClick={handleLogout}
      />
    </>
  );

  return (
    <DropdownMenu
      action={rootAction}
      align="end"
      ariaLabel={t("Account")}
      minWidth={MENU_MIN_WIDTH}
      prepend={header}
      append={footer}
    >
      {children}
    </DropdownMenu>
  );
};

const Identity = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 14px;
`;

const IdentityText = styled.div`
  min-width: 0;
`;

const WorkspaceName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${s("text")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Subtitle = styled.div`
  margin-top: 1px;
  font-size: 12.5px;
  color: ${s("textTertiary")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export default observer(AccountMenu);
