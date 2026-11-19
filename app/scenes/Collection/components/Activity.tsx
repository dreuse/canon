import { observer } from "mobx-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type Collection from "~/models/Collection";
import { ActivityDays } from "~/components/ActivityFeed";
import { SectionHeading } from "~/components/Section";
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
      (event) =>
        ACTIVITY_EVENTS.includes(event.name) &&
        !!event.documentId &&
        documents.get(event.documentId)?.collectionId === collection.id
    )
    .filter((event) => {
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
    <Wrapper aria-labelledby="collection-activity">
      <SectionHeading>
        <h2 id="collection-activity">{t("Activity in this collection")}</h2>
      </SectionHeading>
      <ActivityDays events={items} hideCollection />
    </Wrapper>
  );
});

const Wrapper = styled.section`
  margin-top: 32px;
`;
