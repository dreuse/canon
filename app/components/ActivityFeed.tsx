import { isToday, isYesterday, startOfDay } from "date-fns";
import { observer } from "mobx-react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { unicodeCLDRtoBCP47 } from "@shared/utils/date";
import { Avatar, AvatarSize } from "~/components/Avatar";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import Time from "~/components/Time";
import useStores from "~/hooks/useStores";
import useUserLocale from "~/hooks/useUserLocale";
import type Document from "~/models/Document";
import type Event from "~/models/Event";

/** The size of the collection icon inside a collection chip. */
export const CHIP_ICON_SIZE = 16;

function ActivityVerb({
  name,
  userName,
}: {
  name: string;
  userName: string | undefined;
}) {
  const values = { userName };
  const components = { actor: <ActorName /> };

  switch (name) {
    case "documents.create":
      return (
        <Trans
          defaults="<actor>{{userName}}</actor> created"
          values={values}
          components={components}
        />
      );
    case "documents.publish":
      return (
        <Trans
          defaults="<actor>{{userName}}</actor> published"
          values={values}
          components={components}
        />
      );
    case "documents.unpublish":
      return (
        <Trans
          defaults="<actor>{{userName}}</actor> unpublished"
          values={values}
          components={components}
        />
      );
    case "documents.archive":
      return (
        <Trans
          defaults="<actor>{{userName}}</actor> archived"
          values={values}
          components={components}
        />
      );
    case "documents.unarchive":
      return (
        <Trans
          defaults="<actor>{{userName}}</actor> restored"
          values={values}
          components={components}
        />
      );
    case "documents.restore":
      return (
        <Trans
          defaults="<actor>{{userName}}</actor> restored from trash"
          values={values}
          components={components}
        />
      );
    case "documents.move":
      return (
        <Trans
          defaults="<actor>{{userName}}</actor> moved"
          values={values}
          components={components}
        />
      );
    case "documents.delete":
      return (
        <Trans
          defaults="<actor>{{userName}}</actor> deleted"
          values={values}
          components={components}
        />
      );
    case "comments.create":
      return (
        <Trans
          defaults="<actor>{{userName}}</actor> commented on"
          values={values}
          components={components}
        />
      );
    default:
      return (
        <Trans
          defaults="<actor>{{userName}}</actor> edited"
          values={values}
          components={components}
        />
      );
  }
}

/**
 * A single row of an activity feed.
 *
 * @param props.event the event to render.
 * @param props.hideCollection whether to leave out the collection chip.
 * @returns the row element.
 */
export const ActivityEventRow = observer(function ActivityEventRow({
  event,
  hideCollection,
}: {
  event: Event<Document>;
  hideCollection?: boolean;
}) {
  const { t } = useTranslation();
  const { documents, collections, auth } = useStores();
  const userLocale = useUserLocale();
  const document = event.documentId
    ? documents.get(event.documentId)
    : undefined;
  const collectionId = event.collectionId ?? document?.collectionId;
  const collection = collectionId ? collections.get(collectionId) : undefined;
  const title =
    document?.displayTitle ?? event.documentTitle ?? t("a document");
  const path = document?.isDeleted
    ? event.documentUrl
    : (document?.path ?? event.documentUrl);
  const clock = new Intl.DateTimeFormat(
    userLocale ? unicodeCLDRtoBCP47(userLocale) : undefined,
    { hour: "2-digit", minute: "2-digit" }
  ).format(new Date(event.createdAt));

  return (
    <ActivityRow>
      {event.actor && <Avatar model={event.actor} size={AvatarSize.Small} />}
      <ActivityTitle>
        <ActivityVerb
          name={event.name}
          userName={
            event.actorId === auth.user?.id ? t("You") : event.actor?.name
          }
        />{" "}
        {path ? (
          <ActivityDocument to={path}>{title}</ActivityDocument>
        ) : (
          <ActivityName>{title}</ActivityName>
        )}
      </ActivityTitle>
      {collection && !hideCollection && (
        <ActivityCollection>
          <CollectionIcon collection={collection} size={CHIP_ICON_SIZE} />
          {collection.displayName}
        </ActivityCollection>
      )}
      <RowTime>
        <Time dateTime={event.createdAt}>{clock}</Time>
      </RowTime>
    </ActivityRow>
  );
});

/**
 * Activity events grouped under a heading for each day.
 *
 * @param props.events the events to render, newest first.
 * @param props.hideCollection whether to leave out the collection chip on each row.
 * @returns the grouped rows.
 */
export const ActivityDays = observer(function ActivityDays({
  events,
  hideCollection,
}: {
  events: Event<Document>[];
  hideCollection?: boolean;
}) {
  const { t } = useTranslation();
  const userLocale = useUserLocale();
  const dayFormat = new Intl.DateTimeFormat(
    userLocale ? unicodeCLDRtoBCP47(userLocale) : undefined,
    { day: "numeric", month: "long" }
  );
  const dayLabel = (day: Date) =>
    isToday(day)
      ? t("Today")
      : isYesterday(day)
        ? t("Yesterday")
        : dayFormat.format(day);

  return (
    <>
      {groupByDay(events).map((group) => (
        <div key={group.day.getTime()}>
          <DayHeading>{dayLabel(group.day)}</DayHeading>
          {group.events.map((event) => (
            <ActivityEventRow
              key={event.id}
              event={event}
              hideCollection={hideCollection}
            />
          ))}
        </div>
      ))}
    </>
  );
});

interface DayGroup {
  day: Date;
  events: Event<Document>[];
}

function groupByDay(events: Event<Document>[]) {
  const groups: DayGroup[] = [];
  for (const event of events) {
    const day = startOfDay(new Date(event.createdAt));
    const last = groups[groups.length - 1];
    if (last && last.day.getTime() === day.getTime()) {
      last.events.push(event);
    } else {
      groups.push({ day, events: [event] });
    }
  }
  return groups;
}

const DayHeading = styled.h3`
  margin: 18px 0 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  color: ${s("textTertiary")};
`;

const ActivityRow = styled.div`
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto auto;
  align-items: center;
  column-gap: 12px;
  margin: 0 -10px;
  padding: 9px 10px;
  border-radius: 6px;

  &:hover {
    background: ${s("listItemHoverBackground")};
  }
`;

const ActivityTitle = styled.div`
  grid-column: 2;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: ${s("textSecondary")};
`;

const ActorName = styled.b`
  font-weight: 500;
  color: ${s("text")};
`;

const ActivityDocument = styled(Link)`
  font-weight: 500;
  color: ${s("text")};

  &:hover {
    text-decoration: underline;
  }
`;

const ActivityName = styled.span`
  font-weight: 500;
  color: ${s("text")};
`;

/** A collection icon and name shown beside an activity row or card. */
export const ActivityCollection = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${s("textTertiary")};
  white-space: nowrap;
`;

const RowTime = styled.div`
  grid-column: 4;
  min-width: 36px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: end;
  color: ${s("textTertiary")};
`;
