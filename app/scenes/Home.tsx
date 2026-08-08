import type { TFunction } from "i18next";
import { observer } from "mobx-react";
import { HomeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { type DefaultTheme } from "styled-components";
import { s } from "@shared/styles";
import { NotificationEventType, TeamPreference } from "@shared/types";
import { unicodeCLDRtoBCP47 } from "@shared/utils/date";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { Action } from "~/components/Actions";
import { Avatar } from "~/components/Avatar";
import Heading from "~/components/Heading";
import CollectionIcon from "~/components/Icons/CollectionIcon";
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
  const { documents, events, notifications, collections, auth, ui } =
    useStores();
  const user = useCurrentUser();
  const { t } = useTranslation();
  const { pins, count } = usePinnedDocuments("home");

  const onboardingPreference = auth.team?.getPreference(
    TeamPreference.OnboardingCollectionId
  );
  const onboardingCollection =
    typeof onboardingPreference === "string"
      ? collections.get(onboardingPreference)
      : undefined;

  React.useEffect(() => {
    void documents.fetchRecentlyViewed({ limit: CONTINUE_LIMIT });
    void documents.fetchDrafts({ limit: 100 });
    void events.fetchPage({ limit: ACTIVITY_LIMIT });
    void notifications.fetchPage({ limit: 25 });
  }, [documents, events, notifications]);

  React.useEffect(() => {
    if (!onboardingCollection) {
      return;
    }
    void onboardingCollection.fetchDocuments();
    void documents.fetchPage({
      collectionId: onboardingCollection.id,
      limit: 100,
    });
  }, [documents, onboardingCollection]);

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

  const needsVerification = documents.all.filter(
    (document) =>
      document.createdBy?.id === user.id &&
      !document.isDraft &&
      !document.isDeleted &&
      document.isStale
  );

  const attentionCount =
    mentions.length + needsVerification.length + staleDrafts.length;

  const activity = events.orderedData
    .filter((event) => event.actorId !== user.id && !!event.documentId)
    .slice(0, ACTIVITY_LIMIT);

  const startHereItems = (onboardingCollection?.sortedDocuments ?? []).map(
    (node) => ({
      id: node.id,
      title: node.title,
      url: node.url,
      completed: !!documents.get(node.id)?.lastViewedAt,
    })
  );
  const completedCount = startHereItems.filter((item) => item.completed).length;
  const nextIndex = startHereItems.findIndex((item) => !item.completed);
  const hasStartHere = !!onboardingCollection && startHereItems.length > 0;

  const hasHistory =
    continueReading.length > 0 || activity.length > 0 || attentionCount > 0;
  const startHereExpanded = hasStartHere && !hasHistory;

  const today = new Intl.DateTimeFormat(
    user.language ? unicodeCLDRtoBCP47(user.language) : undefined,
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  ).format(new Date());

  const startHereDescription = onboardingCollection?.data
    ? ProsemirrorDataHelper.toPlainText(onboardingCollection.data).trim()
    : "";

  const startHereCard = hasStartHere ? (
    <RailCard>
      <ModuleLabel>{t("Start here")}</ModuleLabel>
      {startHereDescription && (
        <StartHereDescription>{startHereDescription}</StartHereDescription>
      )}
      <StartHereList>
        {startHereItems.map((item, index) => (
          <StartHereItem
            key={item.id}
            to={item.url}
            $completed={item.completed}
          >
            <Marker $completed={item.completed} $next={index === nextIndex} />
            <StartHereTitle>{item.title}</StartHereTitle>
          </StartHereItem>
        ))}
      </StartHereList>
      <ProgressTrack
        role="progressbar"
        aria-valuenow={completedCount}
        aria-valuemin={0}
        aria-valuemax={startHereItems.length}
      >
        <ProgressFill
          style={{
            width: `${(completedCount / startHereItems.length) * 100}%`,
          }}
        />
      </ProgressTrack>
      <ProgressLine>
        {t("{{ completed }} of {{ total }} completed", {
          completed: completedCount,
          total: startHereItems.length,
        })}
      </ProgressLine>
    </RailCard>
  ) : null;

  return (
    <Scene
      icon={<HomeIcon />}
      title={t("Home")}
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
        {today}
        {" · "}
        {attentionCount
          ? t("{{ count }} items need you", { count: attentionCount })
          : t("Nothing needs you right now")}
      </Caption>

      <PinnedDocuments
        pins={pins}
        placeholderCount={count}
        collapseKey="home"
      />

      <Grid>
        <Main>
          {startHereExpanded && <WideStartHere>{startHereCard}</WideStartHere>}
          {!startHereExpanded && (
            <>
              <Module>
                <ModuleLabel>{t("Continue")}</ModuleLabel>
                {continueReading.length ? (
                  <Cards>
                    {continueReading.map((document) => (
                      <Card key={document.id} to={documentPath(document)}>
                        <CardTitle>{document.titleWithDefault}</CardTitle>
                        <CardMeta>
                          <Time
                            dateTime={document.updatedAt}
                            addSuffix
                            shorten
                          />
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
                    {needsVerification.map((document) => (
                      <AttentionRow key={document.id}>
                        <Dot $tone="stale" />
                        <RowBody>
                          <RowTitle>{document.titleWithDefault}</RowTitle>
                          <RowWhy>
                            {t(
                              "You own this and it is past its review interval"
                            )}
                          </RowWhy>
                        </RowBody>
                        <RowAction to={documentPath(document)}>
                          {t("Verify")}
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
                        {event.actor && (
                          <Avatar model={event.actor} size={24} />
                        )}
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
            </>
          )}
        </Main>

        <Rail>
          {!startHereExpanded && startHereCard}

          <RailCard>
            <ModuleLabel>{t("Your collections")}</ModuleLabel>
            {collections.orderedData.map((collection) => (
              <RailRow key={collection.id} to={collection.path}>
                <CollectionIcon collection={collection} size={20} />
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

const DOT_TONES = {
  mention: (theme: DefaultTheme) => theme.accent,
  stale: (theme: DefaultTheme) => theme.staleText,
  draft: (theme: DefaultTheme) => theme.textTertiary,
};

const Dot = styled.span<{ $tone: keyof typeof DOT_TONES }>`
  flex: 0 0 7px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${(props) => DOT_TONES[props.$tone](props.theme)};
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

const WideStartHere = styled.div`
  margin-bottom: 32px;
  max-width: 520px;
`;

const StartHereDescription = styled.p`
  margin: -4px 0 12px;
  font-size: 12.5px;
  line-height: 1.45;
  color: ${s("textTertiary")};
`;

const StartHereList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 14px;
`;

const StartHereItem = styled(Link)<{ $completed: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  min-height: 30px;
  font-size: 13.5px;

  @media (max-width: 768px), (hover: none) {
    min-height: 44px;
  }

  color: ${(props) =>
    props.$completed ? props.theme.textTertiary : props.theme.textSecondary};

  &:hover {
    color: ${s("text")};
  }
`;

const StartHereTitle = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Marker = styled.span<{ $completed: boolean; $next: boolean }>`
  flex: 0 0 13px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: ${(props) =>
    props.$completed ? props.theme.freshText : "transparent"};
  box-shadow: ${(props) =>
    props.$completed
      ? "none"
      : `inset 0 0 0 ${props.$next ? 2 : 1}px ${
          props.$next ? props.theme.accent : props.theme.divider
        }`};
`;

const ProgressTrack = styled.div`
  height: 3px;
  border-radius: 2px;
  background: ${s("divider")};
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  border-radius: 2px;
  background: ${s("accent")};
`;

const ProgressLine = styled.p`
  margin: 8px 0 0;
  font-size: 12.5px;
  color: ${s("textTertiary")};
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
