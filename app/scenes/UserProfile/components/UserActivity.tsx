import { observer } from "mobx-react";
import {
  ArchiveIcon,
  CollectionIcon,
  CrossIcon,
  EditIcon,
  MoveIcon,
  PadlockIcon,
  PublishIcon,
  RestoreIcon,
  StarredIcon,
  TrashIcon,
  UnpublishIcon,
  UserIcon,
} from "outline-icons";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import ListError from "~/components/List/Error";
import PaginatedList from "~/components/PaginatedList";
import Text from "~/components/Text";
import Time from "~/components/Time";
import type Document from "~/models/Document";
import type Event from "~/models/Event";
import type User from "~/models/User";
import useStores from "~/hooks/useStores";
import Logger from "~/utils/Logger";

interface Props {
  /** The user whose activity is being listed. */
  user: User;
}

interface EventDescription {
  /** The icon shown beside the sentence. */
  icon: ReactNode;
  /** A `Trans` defaults string, where `<link>` wraps the target's name. */
  defaults: string;
}

/**
 * Maps an activity event onto the icon and sentence that describe it. The
 * actor is omitted from the sentence because the profile itself names them.
 *
 * @param event The event to describe.
 * @returns The description, or undefined when the event is not recognised.
 */
export function describeEvent(
  event: Pick<Event<Document>, "name">
): EventDescription | undefined {
  switch (event.name) {
    case "revisions.create":
      return {
        icon: <EditIcon />,
        defaults: "Edited <target>{{title}}</target>",
      };
    case "documents.publish":
      return {
        icon: <PublishIcon />,
        defaults: "Published <target>{{title}}</target>",
      };
    case "documents.unpublish":
      return {
        icon: <UnpublishIcon />,
        defaults: "Unpublished <target>{{title}}</target>",
      };
    case "documents.move":
      return {
        icon: <MoveIcon />,
        defaults: "Moved <target>{{title}}</target>",
      };
    case "documents.archive":
      return {
        icon: <ArchiveIcon />,
        defaults: "Archived <target>{{title}}</target>",
      };
    case "documents.unarchive":
      return {
        icon: <RestoreIcon />,
        defaults: "Restored <target>{{title}}</target> from the archive",
      };
    case "documents.restore":
      return {
        icon: <RestoreIcon />,
        defaults: "Restored <target>{{title}}</target> from trash",
      };
    case "documents.delete":
      return {
        icon: <TrashIcon />,
        defaults: "Deleted <target>{{title}}</target>",
      };
    case "documents.permanent_delete":
      return { icon: <TrashIcon />, defaults: "Permanently deleted {{title}}" };
    case "documents.add_user":
      return {
        icon: <UserIcon />,
        defaults: "Gave {{userName}} access to <target>{{title}}</target>",
      };
    case "documents.remove_user":
      return {
        icon: <CrossIcon />,
        defaults: "Removed {{userName}}'s access to <target>{{title}}</target>",
      };
    case "collections.create":
      return {
        icon: <CollectionIcon />,
        defaults: "Created the collection <target>{{title}}</target>",
      };
    case "collections.delete":
      return {
        icon: <TrashIcon />,
        defaults: "Deleted the collection {{title}}",
      };
    case "collections.move":
      return {
        icon: <MoveIcon />,
        defaults: "Moved the collection <target>{{title}}</target>",
      };
    case "collections.permission_changed":
      return {
        icon: <PadlockIcon />,
        defaults: "Changed permissions on <target>{{title}}</target>",
      };
    case "collections.add_user":
      return {
        icon: <UserIcon />,
        defaults: "Gave {{userName}} access to <target>{{title}}</target>",
      };
    case "collections.remove_user":
      return {
        icon: <CrossIcon />,
        defaults: "Removed {{userName}}'s access to <target>{{title}}</target>",
      };
    case "users.create":
      return { icon: <UserIcon />, defaults: "Joined the workspace" };
    case "users.demote":
      return { icon: <UserIcon />, defaults: "Changed {{userName}}'s role" };
    case "userMemberships.update":
      return {
        icon: <StarredIcon />,
        defaults: "Reordered a shared document",
      };
    default:
      Logger.warn("Unhandled activity event", { name: event.name });
      return undefined;
  }
}

const UserActivityListItem = observer(function UserActivityListItem_({
  event,
}: {
  event: Event<Document>;
}) {
  const { t } = useTranslation();
  const { documents, collections } = useStores();

  const description = describeEvent(event);
  if (!description) {
    return null;
  }

  const document = event.documentId
    ? documents.get(event.documentId)
    : undefined;
  const collection = event.collectionId
    ? collections.get(event.collectionId)
    : undefined;

  const isCollectionEvent = event.name.startsWith("collections.");
  const title = isCollectionEvent
    ? collection?.name
    : (document?.titleWithDefault ?? event.documentTitle);
  const path = isCollectionEvent
    ? collection?.path
    : (document?.path ?? event.documentUrl);

  const fallback = isCollectionEvent ? t("a collection") : t("a document");

  return (
    <Row align="center" gap={8}>
      <Icon>{description.icon}</Icon>
      <Sentence>
        <Trans
          defaults={description.defaults}
          values={{
            title: title ?? fallback,
            userName: event.user?.name ?? t("a user"),
          }}
          components={{
            target: path ? <TargetLink to={path} /> : <strong />,
          }}
        />
      </Sentence>
      <When>
        <Time dateTime={event.createdAt} relative shorten addSuffix />
      </When>
    </Row>
  );
});

/**
 * A paginated, reverse-chronological feed of everything a user has done that
 * the viewer is allowed to see.
 */
export const UserActivity = observer(function UserActivity_({ user }: Props) {
  const { t } = useTranslation();
  const { events } = useStores();

  const options = useMemo(() => ({ actorId: user.id }), [user.id]);

  return (
    <PaginatedList<Event<Document>>
      aria-label={t("Activity")}
      items={events.getByActorId(user.id)}
      fetch={events.fetchPage}
      options={options}
      renderError={(props) => <ListError {...props} />}
      empty={<Empty>{t("No activity yet")}</Empty>}
      renderItem={(item) => <UserActivityListItem key={item.id} event={item} />}
    />
  );
});

const Row = styled(Flex)`
  padding: 8px 0;
  border-bottom: 1px solid ${s("divider")};
  font-size: 14px;
`;

const Icon = styled.span`
  display: flex;
  flex-shrink: 0;
  color: ${s("textTertiary")};
`;

const Sentence = styled.span`
  flex: 1;
  min-width: 0;
  color: ${s("textSecondary")};
`;

const TargetLink = styled(Link)`
  color: ${s("text")};
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const When = styled(Text).attrs({ type: "tertiary", size: "xsmall" })`
  flex-shrink: 0;
  white-space: nowrap;
`;
