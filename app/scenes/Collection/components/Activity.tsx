import { observer } from "mobx-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { hairline, s } from "@shared/styles";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import type Event from "~/models/Event";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Time from "~/components/Time";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";

const ACTIVITY_LIMIT = 8;
const ACTIVITY_SCAN_LIMIT = 100;

const ACTIVITY_EVENTS = [
  "documents.publish",
  "documents.move",
  "documents.archive",
  "documents.unarchive",
  "documents.restore",
  "comments.create",
  "revisions.create",
];

type Props = {
  collection: Collection;
};

export const Activity = observer(function Activity_({ collection }: Props) {
  const { t } = useTranslation();
  const { events, documents } = useStores();
  const sidebarContext = useLocationSidebarContext();

  useEffect(() => {
    void events.fetchPage({
      collectionId: collection.id,
      limit: ACTIVITY_SCAN_LIMIT,
    });
    void events.fetchPage({ limit: ACTIVITY_SCAN_LIMIT });
  }, [collection.id, events]);

  const seen = new Set<string>();
  const items = events.orderedData
    .filter(
      (event) => ACTIVITY_EVENTS.includes(event.name) && !!event.documentId
    )
    .map((event) => ({ event, document: documents.get(event.documentId!) }))
    .filter(
      (item): item is { event: Event<Document>; document: Document } =>
        !!item.document && item.document.collectionId === collection.id
    )
    .filter(({ event }) => {
      const key = `${event.name}:${event.documentId}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, ACTIVITY_LIMIT);

  if (!items.length) {
    return null;
  }

  return (
    <Wrapper>
      <Label>{t("Activity in this collection")}</Label>
      {items.map(({ event, document }) => (
        <Row key={event.id}>
          <Avatar model={event.actor} size={AvatarSize.Small} />
          <Sentence>
            {describe(event, t)}{" "}
            <DocumentLink
              to={{ pathname: document.path, state: { sidebarContext } }}
            >
              {document.titleWithDefault}
            </DocumentLink>
          </Sentence>
          <When>
            <Time dateTime={event.createdAt} relative shorten addSuffix />
          </When>
        </Row>
      ))}
    </Wrapper>
  );
});

function describe(event: Event<Document>, t: TFunction) {
  const opts = { userName: event.actor?.name };

  switch (event.name) {
    case "documents.move":
      return t("{{userName}} moved", opts);
    case "documents.archive":
      return t("{{userName}} archived", opts);
    case "documents.unarchive":
    case "documents.restore":
      return t("{{userName}} restored", opts);
    case "comments.create":
      return t("{{userName}} commented on", opts);
    case "revisions.create":
      return t("{{userName}} updated", opts);
    default:
      return t("{{userName}} published", opts);
  }
}

const Wrapper = styled.div`
  margin-top: 32px;
`;

const Label = styled.h3`
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${s("textTertiary")};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid ${hairline};
  font-size: 13px;
  color: ${s("textSecondary")};
`;

const Sentence = styled.span`
  min-width: 0;
  flex: 1 1 auto;
`;

const DocumentLink = styled(Link)`
  color: ${s("accent")};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const When = styled.span`
  flex: 0 0 auto;
  color: ${s("textTertiary")};
`;
