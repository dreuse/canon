import type { TFunction } from "i18next";
import { observer } from "mobx-react";
import { HomeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { NotificationEventType } from "@shared/types";
import { Action } from "~/components/Actions";
import { Avatar } from "~/components/Avatar";
import Heading from "~/components/Heading";
import InputSearchPage from "~/components/InputSearchPage";
import LanguagePrompt from "~/components/LanguagePrompt";
import PinnedDocuments from "~/components/PinnedDocuments";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Scene from "~/components/Scene";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import { usePinnedDocuments } from "~/hooks/usePinnedDocuments";
import useStores from "~/hooks/useStores";
import NewDocumentMenu from "~/menus/NewDocumentMenu";
import { documentPath } from "~/utils/routeHelpers";

const CONTINUE_LIMIT = 2;

const ACTIVITY_LIMIT = 6;

const STALE_DRAFT_DAYS = 7;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const MENTION_EVENTS = [
  NotificationEventType.MentionedInDocument,
  NotificationEventType.MentionedInComment,
  NotificationEventType.GroupMentionedInDocument,
  NotificationEventType.GroupMentionedInComment,
  NotificationEventType.CreateComment,
];

function activityVerb(
  name: string,
  userName: string | undefined,
  t: TFunction
) {
  const opts = { userName };

  switch (name) {
    case "documents.publish":
      return t("{{userName}} published", opts);
    case "documents.unpublish":
      return t("{{userName}} unpublished", opts);
    case "documents.archive":
      return t("{{userName}} archived", opts);
    case "documents.unarchive":
      return t("{{userName}} restored", opts);
    case "documents.restore":
      return t("{{userName}} moved from trash", opts);
    case "documents.move":
      return t("{{userName}} moved", opts);
    case "documents.delete":
      return t("{{userName}} deleted", opts);
    default:
      return t("{{ userName }} updated", opts);
  }
}

function Home() {
  const { documents, events, notifications, collections, ui } = useStores();
  const user = useCurrentUser();
  const { t } = useTranslation();
  const { pins, count } = usePinnedDocuments("home");

  React.useEffect(() => {
    void documents.fetchRecentlyViewed({ limit: CONTINUE_LIMIT });
    void documents.fetchDrafts({ limit: 100 });
    void events.fetchPage({ limit: ACTIVITY_LIMIT });
    void notifications.fetchPage({ limit: 25 });
  }, [documents, events, notifications]);

  const continueReading = documents.recentlyViewed.slice(0, CONTINUE_LIMIT);

  const mentions = notifications.active.filter(
    (notification) =>
      MENTION_EVENTS.includes(notification.event) && !notification.viewedAt
  );

  const staleDrafts = documents
    .drafts({})
    .filter(
      (draft) =>
        Date.now() - new Date(draft.updatedAt).getTime() >
        STALE_DRAFT_DAYS * MILLISECONDS_PER_DAY
    );

  const attentionCount = mentions.length + staleDrafts.length;

  const activity = events.orderedData
    .filter((event) => event.actorId !== user.id && !!event.documentId)
    .slice(0, ACTIVITY_LIMIT);

  return (
    <Scene
      icon={<HomeIcon />}
      title={t("Home")}
      left={
        <InputSearchPage source="dashboard" label={t("Search documents")} />
      }
      actions={
        <Action>
          <NewDocumentMenu />
        </Action>
      }
    >
      <ResizingHeightContainer>
        {!ui.languagePromptDismissed && <LanguagePrompt key="language" />}
      </ResizingHeightContainer>
      <Heading>{t("Home")}</Heading>
      <Caption>
        {attentionCount
          ? t("{{ count }} items need you", { count: attentionCount })
          : t("Nothing needs you right now")}
      </Caption>

      <PinnedDocuments pins={pins} placeholderCount={count} collapseKey="home" />

      <Grid>
        <Main>
          <Module>
            <ModuleLabel>{t("Continue")}</ModuleLabel>
            {continueReading.length ? (
              <Cards>
                {continueReading.map((document) => (
                  <Card key={document.id} to={documentPath(document)}>
                    <CardTitle>{document.titleWithDefault}</CardTitle>
                    <CardMeta>
                      <Time dateTime={document.updatedAt} addSuffix shorten />
                    </CardMeta>
                  </Card>
                ))}
              </Cards>
            ) : (
              <EmptyLine>{t("Nothing opened yet")}</EmptyLine>
            )}
          </Module>

          <Module>
            <ModuleLabel>
              {t("Needs you")}
              {attentionCount > 0 && <Pill>{attentionCount}</Pill>}
            </ModuleLabel>
            {attentionCount ? (
              <Attention>
                {mentions.map((notification) => (
                  <AttentionRow key={notification.id}>
                    <Dot $tone="mention" />
                    <RowBody>
                      <RowTitle>{notification.subject}</RowTitle>
                      <RowWhy>{t("You were mentioned")}</RowWhy>
                    </RowBody>
                    <RowAction to={notification.path ?? "/home"}>
                      {t("Reply")}
                    </RowAction>
                  </AttentionRow>
                ))}
                {staleDrafts.map((draft) => (
                  <AttentionRow key={draft.id}>
                    <Dot $tone="draft" />
                    <RowBody>
                      <RowTitle>{draft.titleWithDefault}</RowTitle>
                      <RowWhy>
                        {t("Draft not updated in over a week")}
                      </RowWhy>
                    </RowBody>
                    <RowAction to={documentPath(draft)}>
                      {t("Publish")}
                    </RowAction>
                  </AttentionRow>
                ))}
              </Attention>
            ) : (
              <EmptyLine>{t("You are all caught up")}</EmptyLine>
            )}
          </Module>

          <Module>
            <ModuleLabel>{t("Changed recently")}</ModuleLabel>
            {activity.length ? (
              <div>
                {activity.map((event) => (
                  <ActivityRow key={event.id}>
                    {event.actor && <Avatar model={event.actor} size={24} />}
                    <RowBody>
                      <RowTitle>
                        {activityVerb(event.name, event.actor?.name, t)}{" "}
                        <ActivityDocument to={`/doc/${event.documentId}`}>
                          {event.document?.title ?? t("a document")}
                        </ActivityDocument>
                      </RowTitle>
                    </RowBody>
                    <RowTime>
                      <Time dateTime={event.createdAt} addSuffix shorten />
                    </RowTime>
                  </ActivityRow>
                ))}
              </div>
            ) : (
              <EmptyLine>{t("No activity from others yet")}</EmptyLine>
            )}
          </Module>
        </Main>

        <Rail>
          <RailCard>
            <ModuleLabel>{t("Your collections")}</ModuleLabel>
            {collections.orderedData.map((collection) => (
              <RailRow key={collection.id} to={collection.path}>
                <Swatch style={{ background: collection.color ?? undefined }} />
                {collection.name}
              </RailRow>
            ))}
          </RailCard>

          <RailCard>
            <RailLink to="/drafts">
              {t("{{ count }} drafts", { count: documents.drafts({}).length })}
            </RailLink>
            {staleDrafts.length > 0 && (
              <RailNote>
                {t("{{ count }} untouched for over a week", {
                  count: staleDrafts.length,
                })}
              </RailNote>
            )}
          </RailCard>
        </Rail>
      </Grid>
    </Scene>
  );
}

const Caption = styled.p`
  margin: -12px 0 24px;
  color: ${s("textTertiary")};
  font-size: 14px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 274px;
  gap: 32px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Main = styled.div`
  min-width: 0;
`;

const Module = styled.section`
  margin-bottom: 32px;
`;

const ModuleLabel = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 11px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: ${s("textTertiary")};
`;

const Pill = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  color: ${s("accent")};
  background: ${s("listItemHoverBackground")};
  border-radius: 9px;
  padding: 3px 7px;
  letter-spacing: 0;
`;

const EmptyLine = styled.p`
  margin: 0;
  color: ${s("textTertiary")};
  font-size: 14px;
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
`;

const Card = styled(Link)`
  display: block;
  padding: 13px 15px;
  border: 1px solid ${s("divider")};
  border-radius: 9px;
  color: inherit;

  &:hover {
    background: ${s("listItemHoverBackground")};
  }
`;

const CardTitle = styled.div`
  font-size: 15px;
  font-weight: 500;
  color: ${s("text")};
`;

const CardMeta = styled.div`
  margin-top: 4px;
  font-size: 12.5px;
  color: ${s("textTertiary")};
`;

const Attention = styled.div`
  border: 1px solid ${s("divider")};
  border-radius: 9px;
  overflow: hidden;
`;

const AttentionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 15px;
  border-bottom: 1px solid ${s("divider")};

  &:last-child {
    border-bottom: 0;
  }
`;

const Dot = styled.span<{ $tone: "mention" | "draft" }>`
  flex: 0 0 7px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${(props) =>
    props.$tone === "mention" ? props.theme.accent : props.theme.textTertiary};
`;

const RowBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const RowTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${s("text")};
`;

const RowWhy = styled.div`
  margin-top: 2px;
  font-size: 12.5px;
  color: ${s("textTertiary")};
`;

const RowAction = styled(Link)`
  flex: 0 0 auto;
  border: 1px solid ${s("divider")};
  border-radius: 6px;
  padding: 6px 11px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${s("textSecondary")};

  &:hover {
    background: ${s("listItemHoverBackground")};
  }
`;

const RowTime = styled.div`
  flex: 0 0 auto;
  font-size: 12.5px;
  color: ${s("textTertiary")};
`;

const ActivityRow = styled.div`
  display: flex;
  gap: 11px;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid ${s("divider")};

  &:last-child {
    border-bottom: 0;
  }
`;

const ActivityDocument = styled(Link)`
  font-weight: 600;
  color: ${s("text")};
`;

const Rail = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
`;

const RailCard = styled.div`
  border: 1px solid ${s("divider")};
  border-radius: 9px;
  padding: 15px;
`;

const RailRow = styled(Link)`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 5px 0;
  font-size: 13.5px;
  color: ${s("textSecondary")};

  &:hover {
    color: ${s("text")};
  }
`;

const Swatch = styled.span`
  flex: 0 0 7px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
`;

const RailLink = styled(Link)`
  font-size: 18px;
  font-weight: 600;
  color: ${s("text")};
`;

const RailNote = styled.p`
  margin: 6px 0 0;
  font-size: 12.5px;
  color: ${s("textTertiary")};
`;

export default observer(Home);
