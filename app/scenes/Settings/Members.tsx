import { observer } from "mobx-react";
import { PlusIcon, UserIcon } from "outline-icons";
import { useCallback } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import { Tab, Tabs } from "~/components/Tabs";
import Text from "~/components/Text";
import { HStack } from "~/components/primitives/HStack";
import { inviteUser } from "~/actions/definitions/users";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { settingsPath } from "~/utils/routeHelpers";
import GroupsPanel from "./Groups";
import UsersPanel from "./Users";
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
    <Scene title={t("Members")} icon={<UserIcon />} measure="full">
      <TitleRow>
        <Heading>{t("Members")}</Heading>
        <HStack spacing={8}>
          {isGroups
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
              )}
        </HStack>
      </TitleRow>
      <Text as="p" type="secondary">
        <Trans>
          Everyone who has signed in. People with SSO access who have not signed
          in yet do not appear here.
        </Trans>
      </Text>

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

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 48px 0 18px;

  h1 {
    margin: 0;
  }
`;

export default observer(Members);
