import { debounce } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { EmailIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import { toast } from "sonner";
import { s } from "@shared/styles";
import { NotificationEventType, UserPreference } from "@shared/types";
import Notice from "~/components/Notice";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import isCloudHosted from "~/utils/isCloudHosted";
import SettingRow from "./components/SettingRow";
import { SettingsTitle } from "./components/SettingsTitle";

const DIMMED_OPACITY = 0.5;

interface Group {
  title: string;
  options: Option[];
}

interface Option {
  events: NotificationEventType[];
  title: string;
  description: string;
  visible?: boolean;
}

function Notifications() {
  const user = useCurrentUser();
  const { t } = useTranslation();
  const emailEnabled = user.getPreference(UserPreference.EmailNotifications);

  const groups: Group[] = [
    {
      title: t("Documents"),
      options: [
        {
          events: [NotificationEventType.PublishDocument],
          title: t("Document published"),
          description: t("When someone publishes in a collection you follow."),
        },
        {
          events: [NotificationEventType.UpdateDocument],
          title: t("Document updated"),
          description: t("When someone edits a document you follow."),
        },
      ],
    },
    {
      title: t("Comments and mentions"),
      options: [
        {
          events: [NotificationEventType.CreateComment],
          title: t("New comment"),
          description: t("When someone comments on a document you follow."),
        },
        {
          events: [
            NotificationEventType.MentionedInComment,
            NotificationEventType.MentionedInDocument,
          ],
          title: t("Mention of you"),
          description: t("When someone mentions you in a document or comment."),
        },
        {
          events: [
            NotificationEventType.GroupMentionedInDocument,
            NotificationEventType.GroupMentionedInComment,
          ],
          title: t("Mention of your group"),
          description: t("When someone mentions a group you belong to."),
        },
        {
          events: [NotificationEventType.ResolveComment],
          title: t("Conversation resolved"),
          description: t("When someone resolves a thread you took part in."),
        },
        {
          events: [NotificationEventType.ReactionsCreate],
          title: t("Reaction"),
          description: t("When someone reacts to your comment."),
        },
      ],
    },
    {
      title: t("Access and invites"),
      options: [
        {
          events: [NotificationEventType.AddUserToCollection],
          title: t("Collection invite"),
          description: t("When someone gives you access to a collection."),
        },
        {
          events: [NotificationEventType.AddUserToDocument],
          title: t("Document invite"),
          description: t("When someone shares a document with you."),
        },
        {
          events: [NotificationEventType.RequestDocumentAccess],
          title: t("Access request"),
          description: t(
            "When someone requests access to a document of yours."
          ),
        },
        {
          events: [NotificationEventType.InviteAccepted],
          title: t("Invite accepted"),
          description: t("When someone you invited joins the workspace."),
        },
        {
          events: [NotificationEventType.AddUserToGroup],
          title: t("Added to group"),
          description: t("When someone adds you to a group."),
        },
        {
          events: [NotificationEventType.CreateCollection],
          title: t("New collection"),
          description: t("When someone creates a collection in the workspace."),
        },
      ],
    },
    {
      title: t("Account and news"),
      options: [
        {
          events: [NotificationEventType.ExportCompleted],
          title: t("Export completed"),
          description: t("When an export you requested is ready."),
        },
        {
          visible: isCloudHosted,
          events: [NotificationEventType.Onboarding],
          title: t("Getting started"),
          description: t("Tips for getting started with the features."),
        },
        {
          visible: isCloudHosted,
          events: [NotificationEventType.Features],
          title: t("News"),
          description: t("When a relevant change reaches the product."),
        },
      ],
    },
  ];

  const showSuccessMessage = debounce(() => {
    toast.success(t("Notifications saved"));
  }, 500);

  const handleChange = React.useCallback(
    (eventTypes: NotificationEventType[]) => async (checked: boolean) => {
      // Sequential, as each request saves the full settings object.
      for (const eventType of eventTypes) {
        await user.setNotificationEventType(eventType, checked);
      }
      showSuccessMessage();
    },
    [user, showSuccessMessage]
  );

  const handleToggleEmail = React.useCallback(
    async (checked: boolean) => {
      await user.savePreference(UserPreference.EmailNotifications, checked);
      showSuccessMessage();
    },
    [user, showSuccessMessage]
  );

  const showSuccessNotice = window.location.search === "?success";

  return (
    <Scene title={t("Notifications")} icon={<EmailIcon />}>
      <SettingsTitle title={t("Notifications")} />

      {showSuccessNotice && (
        <Notice>
          <Trans>
            Unsubscription successful. Your notification settings were updated
          </Trans>
        </Notice>
      )}
      <Text as="p" type="secondary">
        <Trans>
          Choose which emails you receive. In-app notifications stay the same.
          Each change applies at once.
        </Trans>
      </Text>

      <Card>
        <SettingRow
          name={UserPreference.EmailNotifications}
          label={t("Email notifications")}
          description={
            <Text size="small" type="secondary">
              {t("Turn off to pause all emails below. Your choices are kept.")}
            </Text>
          }
          compact
        >
          <Switch
            id={UserPreference.EmailNotifications}
            name={UserPreference.EmailNotifications}
            checked={emailEnabled}
            onChange={handleToggleEmail}
          />
        </SettingRow>
      </Card>

      <>
        {groups.map((group) => {
          const options = group.options.filter((o) => o.visible !== false);
          if (!options.length) {
            return null;
          }

          return (
            <section key={group.title}>
              <GroupTitle>{group.title}</GroupTitle>
              <Card $dimmed={!emailEnabled}>
                {options.map((option) => {
                  const [name] = option.events;
                  const checked = option.events.every((eventType) =>
                    user.subscribedToEventType(eventType)
                  );

                  return (
                    <SettingRow
                      key={name}
                      label={option.title}
                      name={name}
                      description={
                        <Text size="small" type="secondary">
                          {option.description}
                        </Text>
                      }
                      compact
                    >
                      <Switch
                        id={name}
                        name={name}
                        checked={checked}
                        disabled={!emailEnabled}
                        onChange={handleChange(option.events)}
                      />
                    </SettingRow>
                  );
                })}
              </Card>
            </section>
          );
        })}
      </>
    </Scene>
  );
}

const Card = styled.div<{ $dimmed?: boolean }>`
  opacity: ${(props) => (props.$dimmed ? DIMMED_OPACITY : 1)};
  padding: 0 16px;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
`;

const GroupTitle = styled.h2`
  margin: 32px 0 12px;
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
  color: ${s("text")};
`;

export default observer(Notifications);
