import { observer } from "mobx-react";
import { PadlockIcon } from "outline-icons";
import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router-dom";
import { UrlHelper } from "@shared/utils/UrlHelper";
import type ApiKey from "~/models/ApiKey";
import type OAuthAuthentication from "~/models/oauth/OAuthAuthentication";
import Button from "~/components/Button";
import PaginatedList from "~/components/PaginatedList";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { createApiKey } from "~/actions/definitions/apiKeys";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { settingsPath } from "~/utils/routeHelpers";
import ApiKeyListItem from "./components/ApiKeyListItem";
import { SettingGroup } from "./components/SettingGroup";
import OAuthAuthenticationListItem from "./components/OAuthAuthenticationListItem";

import { SettingsTitle } from "./components/SettingsTitle";

function APIAndAccess() {
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const { t } = useTranslation();
  const { apiKeys, oauthAuthentications } = useStores();
  const can = usePolicy(team);
  const appName = env.APP_NAME;

  return (
    <Scene title={t("Access & keys")} icon={<PadlockIcon />}>
      <SettingsTitle
        title={t("Access & keys")}
        actions={
          can.createApiKey ? (
            <Button
              type="submit"
              value={`${t("New API key")}…`}
              action={createApiKey}
            />
          ) : null
        }
      >
        <Link to={settingsPath("passkeys")}>{t("Manage passkeys")}</Link>
      </SettingsTitle>
      <SettingGroup>{t("Personal keys")}</SettingGroup>
      {can.createApiKey ? (
        <Text as="p" type="secondary">
          <Trans
            defaults="Create personal API keys to authenticate with the API and programatically control
      your workspace's data. For more details see the <em>developer documentation</em>."
            components={{
              em: (
                <a
                  href={UrlHelper.developers}
                  target="_blank"
                  rel="noreferrer"
                />
              ),
            }}
          />
        </Text>
      ) : (
        <Trans>API keys have been disabled by an admin for your account</Trans>
      )}
      <PaginatedList<ApiKey>
        fetch={apiKeys.fetchPage}
        items={apiKeys.personalApiKeys}
        options={{ userId: user.id }}
        renderItem={(apiKey) => (
          <ApiKeyListItem key={apiKey.id} apiKey={apiKey} />
        )}
      />
      <PaginatedList
        fetch={oauthAuthentications.fetchPage}
        items={oauthAuthentications.orderedData}
        heading={
          <>
            <SettingGroup>{t("Application access")}</SettingGroup>
            <Text as="p" type="secondary">
              {t(
                "Manage which third-party and internal applications have been granted access to your {{ appName }} account.",
                { appName }
              )}
            </Text>
          </>
        }
        renderItem={(oauthAuthentication: OAuthAuthentication) => (
          <OAuthAuthenticationListItem
            key={oauthAuthentication.id}
            oauthAuthentication={oauthAuthentication}
          />
        )}
      />
    </Scene>
  );
}

export default observer(APIAndAccess);
