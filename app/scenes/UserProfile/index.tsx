import { observer } from "mobx-react";
import { ProfileIcon } from "outline-icons";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { dateLocale } from "@shared/utils/date";
import { toError } from "@shared/utils/error";
import { userPath } from "@shared/utils/routeHelpers";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import PlaceholderText from "~/components/PlaceholderText";
import Scene from "~/components/Scene";
import { Tab, Tabs } from "~/components/Tabs";
import useCurrentUser from "~/hooks/useCurrentUser";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import Error404 from "~/scenes/Errors/Error404";
import { ContributionGraph } from "./components/ContributionGraph";
import { ProfileHeader } from "./components/ProfileHeader";
import { UserActivity } from "./components/UserActivity";
import type { WeekStart } from "./components/contributionGrid";

/**
 * A member's profile: who they are, how much they have contributed over the
 * last year, what they have been doing, and what they have written.
 */
export const UserProfileScene = observer(function UserProfileScene_() {
  const { t } = useTranslation();
  const { userId, tab } = useParams<{ userId: string; tab?: string }>();
  const { users, documents } = useStores();
  const currentUser = useCurrentUser();
  const [error, setError] = useState<Error | undefined>();

  const user = users.get(userId);

  useEffect(() => {
    void users.fetch(userId).catch((err) => setError(toError(err)));
  }, [users, userId]);

  const {
    data: contributions,
    error: contributionsError,
    request: retryContributions,
  } = useRequest(
    useCallback(() => users.fetchContributions(userId), [users, userId]),
    true
  );

  const fetchDocuments = useCallback(
    (options: Record<string, unknown>) => documents.fetchPage(options),
    [documents]
  );

  if (error) {
    return <Error404 />;
  }

  if (!user) {
    return (
      <Scene title={t("Profile")} icon={<ProfileIcon />}>
        <PlaceholderText height={32} />
      </Scene>
    );
  }

  const isSelf = user.id === currentUser.id;
  const locale = dateLocale(currentUser.language);
  const weekStartsOn = (locale?.options?.weekStartsOn ?? 0) as WeekStart;

  return (
    <Scene title={user.name} textTitle={user.name} icon={<ProfileIcon />}>
      <Flex column gap={24}>
        <ProfileHeader
          user={user}
          stats={contributions?.stats}
          isSelf={isSelf}
        />

        {contributionsError ? (
          <Empty>
            {t("Contributions could not be loaded")}{" "}
            <Button neutral onClick={retryContributions}>
              {t("Retry")}
            </Button>
          </Empty>
        ) : (
          <ContributionGraph
            counts={contributions?.counts ?? {}}
            total={contributions?.total ?? 0}
            weekStartsOn={weekStartsOn}
            locale={locale}
          />
        )}

        <div>
          <Tabs>
            <Tab to={userPath(user.id)} exact>
              {t("Activity")}
            </Tab>
            <Tab to={`${userPath(user.id)}/documents`} exact>
              {t("Documents")}
            </Tab>
          </Tabs>

          {tab === "documents" ? (
            <PaginatedDocumentList
              documents={documents.createdByUser(user.id)}
              fetch={fetchDocuments}
              options={{ userId: user.id }}
              empty={
                <Empty>
                  {t("{{ name }} hasn't created any documents yet", {
                    name: user.name,
                  })}
                </Empty>
              }
            />
          ) : (
            <UserActivity user={user} />
          )}
        </div>
      </Flex>
    </Scene>
  );
});
