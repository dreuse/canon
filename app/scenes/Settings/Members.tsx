import { observer } from "mobx-react";
import { PlusIcon, UserIcon } from "outline-icons";
import { useCallback } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import Button from "~/components/Button";
import Scene from "~/components/Scene";
import { Tab, Tabs } from "~/components/Tabs";
import { inviteUser } from "~/actions/definitions/users";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { settingsPath } from "~/utils/routeHelpers";
import GroupsPanel from "./Groups";
import UsersPanel from "./Users";
import { SettingsTitle } from "./components/SettingsTitle";
import { CreateGroupDialog } from "./components/GroupDialogs";

function Members() {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const location = useLocation();

  const isGroups = location.pathname.startsWith(settingsPath("groups"));

  const handleNewGroup = useCallback(() => {
    dialogs.openModal({
      title: t("Create a group"),
      content: <CreateGroupDialog />,
    });
  }, [t, dialogs]);

  return (
    <Scene title={t("Members")} icon={<UserIcon />}>
      <SettingsTitle
        title={t("Members")}
        actions={
          isGroups
            ? can.createGroup && (
                <Button
                  type="button"
                  onClick={handleNewGroup}
                  icon={<PlusIcon />}
                >
                  {`${t("New group")}…`}
                </Button>
              )
            : can.inviteUser && (
                <Button
                  type="button"
                  data-on="click"
                  data-event-category="invite"
                  data-event-action="peoplePage"
                  action={inviteUser}
                  icon={<PlusIcon />}
                >
                  {t("Invite people")}…
                </Button>
              )
        }
      >
        <Trans>
          Everyone who has signed in. People with SSO access who have not signed
          in yet do not appear here.
        </Trans>
      </SettingsTitle>

      <Tabs>
        <Tab to={settingsPath("users")} exact>
          {t("People")}
        </Tab>
        <Tab to={settingsPath("groups")} exact>
          {t("Groups")}
        </Tab>
      </Tabs>

      {isGroups ? <GroupsPanel /> : <UsersPanel />}
    </Scene>
  );
}

export default observer(Members);
