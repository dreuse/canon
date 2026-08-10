import { observer } from "mobx-react";
import { InternetIcon } from "outline-icons";
import { useTranslation, Trans } from "react-i18next";
import { UrlHelper } from "@shared/utils/UrlHelper";
import type OAuthClient from "~/models/oauth/OAuthClient";
import Button from "~/components/Button";
import PaginatedList from "~/components/PaginatedList";
import Scene from "~/components/Scene";
import { createOAuthClient } from "~/actions/definitions/oauthClients";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import env from "~/env";
import OAuthClientListItem from "./components/OAuthClientListItem";

import { SettingsTitle } from "./components/SettingsTitle";

function Applications() {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { oauthClients } = useStores();
  const can = usePolicy(team);

  return (
    <Scene title={t("Applications")} icon={<InternetIcon />}>
      <SettingsTitle
        title={t("Applications")}
        actions={
          can.createOAuthClient ? (
            <Button
              type="submit"
              value={`${t("New App")}…`}
              action={createOAuthClient}
            />
          ) : null
        }
      >
        <Trans
          defaults="Applications allow you to build internal or public integrations with {{ appName }} and provide secure access via OAuth. For more details see the <em>developer documentation</em>."
          values={{ appName: env.APP_NAME }}
          components={{
            em: (
              <a href={UrlHelper.developers} target="_blank" rel="noreferrer" />
            ),
          }}
        />
      </SettingsTitle>
      <PaginatedList<OAuthClient>
        fetch={oauthClients.fetchPage}
        items={oauthClients.orderedData}
        renderItem={(oauthClient) => (
          <OAuthClientListItem key={oauthClient.id} oauthClient={oauthClient} />
        )}
      />
    </Scene>
  );
}

export default observer(Applications);
