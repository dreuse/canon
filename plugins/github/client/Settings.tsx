import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { IntegrationService } from "@shared/types";
import { ConnectedButton } from "~/scenes/Settings/components/ConnectedButton";
import { IntegrationScene } from "~/scenes/Settings/components/IntegrationScene";
import { AvatarSize } from "~/components/Avatar";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import List from "~/components/List";
import ListItem from "~/components/List/Item";
import Notice from "~/components/Notice";
import PlaceholderText from "~/components/PlaceholderText";
import TeamLogo from "~/components/TeamLogo";
import { SettingsTitle } from "~/scenes/Settings/components/SettingsTitle";
import Text from "~/components/Text";
import Time from "~/components/Time";
import env from "~/env";
import useQuery from "~/hooks/useQuery";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import isCloudHosted from "~/utils/isCloudHosted";
import { isTruthyQueryValue } from "~/utils/urls";
import GitHubIcon from "./Icon";
import type { GitHubAppIdentity } from "../shared/GitHubUtils";
import { GitHubConnectButton } from "./components/GitHubButton";
import { GitHubCreateAppForm } from "./components/GitHubCreateAppForm";

const fetchApp = async () => {
  const res = await client.post<{ data: GitHubAppIdentity | null }>(
    "/github.app"
  );
  return res.data;
};

function GitHub() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const githubIntegrations = integrations.filterByService(
    IntegrationService.GitHub
  );
  const query = useQuery();
  const error = query.get("error");
  const installRequest = query.get("install_request");
  const appName = env.APP_NAME;
  const { data: app, loaded } = useRequest(fetchApp, true);
  const githubAppName = app?.slug;

  React.useEffect(() => {
    void integrations.fetchAllIfNeeded({
      service: IntegrationService.GitHub,
      withRelations: true,
    });
  }, [integrations]);

  return (
    <IntegrationScene title="GitHub" icon={<GitHubIcon />}>
      <SettingsTitle title="GitHub" />

      {error === "access_denied" && (
        <Notice>
          <Trans>
            Whoops, you need to accept the permissions in GitHub to connect{" "}
            {{ appName }} to your workspace. Try again?
          </Trans>
        </Notice>
      )}
      {error === "unauthenticated" && (
        <Notice>
          <Trans>
            Something went wrong while authenticating your request. Please try
            logging in again.
          </Trans>
        </Notice>
      )}
      {error === "denied" && (
        <Notice>
          <Trans>
            Only an owner of the GitHub account or organization can connect it
            to {{ appName }}.
          </Trans>
        </Notice>
      )}
      {error === "missing_permission" && (
        <Notice>
          {isCloudHosted ? (
            <Trans>
              The GitHub app needs new permissions for the organization. Ask an
              owner of the organization to accept them in GitHub, then try
              again.
            </Trans>
          ) : (
            <Trans>
              The GitHub app needs the “Members” read permission for the
              organization. Add this permission to your GitHub app, then ask an
              owner of the organization to accept it in GitHub and try again.
            </Trans>
          )}
        </Notice>
      )}
      {isTruthyQueryValue(installRequest) && (
        <Notice>
          <Trans>
            The owner of the GitHub account has been requested to install the{" "}
            {{ githubAppName }} GitHub app. Once approved, previews will be
            shown for the respective links.
          </Trans>
        </Notice>
      )}
      {!loaded ? null : app ? (
        <>
          <Text as="p">
            <Trans>
              Enable previews of GitHub issues and pull requests in documents by
              connecting a GitHub organization or specific repositories to{" "}
              {{ appName }}.
            </Trans>
          </Text>

          {githubIntegrations.length ? (
            <>
              <Heading as="h2">
                <Flex justify="space-between" auto>
                  {t("Connected")}
                  <GitHubConnectButton app={app} icon={<PlusIcon />} />
                </Flex>
              </Heading>
              <List>
                {githubIntegrations.map((integration) => {
                  const githubAccount =
                    integration.settings?.github?.installation.account;
                  const integrationCreatedBy = integration.user
                    ? integration.user.name
                    : undefined;

                  return (
                    <ListItem
                      key={githubAccount?.id}
                      small
                      title={githubAccount?.name}
                      subtitle={
                        integrationCreatedBy ? (
                          <>
                            <Trans>Enabled by {{ integrationCreatedBy }}</Trans>{" "}
                            &middot;{" "}
                            <Time
                              dateTime={integration.createdAt}
                              relative={false}
                              format={{ en_US: "MMMM d, y" }}
                            />
                          </>
                        ) : (
                          <PlaceholderText />
                        )
                      }
                      image={
                        <TeamLogo
                          src={githubAccount?.avatarUrl}
                          size={AvatarSize.Large}
                        />
                      }
                      actions={
                        <ConnectedButton
                          onClick={integration.delete}
                          confirmationMessage={t(
                            "Disconnecting will prevent previewing GitHub links from this organization in documents. Are you sure?"
                          )}
                        />
                      }
                    />
                  );
                })}
              </List>
            </>
          ) : (
            <p>
              <GitHubConnectButton app={app} icon={<GitHubIcon />} />
            </p>
          )}
        </>
      ) : isCloudHosted ? null : (
        <GitHubCreateAppForm />
      )}
    </IntegrationScene>
  );
}

export default observer(GitHub);
