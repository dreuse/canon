import type { TFunction } from "i18next";
import { observer } from "mobx-react";
import { DocumentIcon, HomeIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { transparentize } from "polished";
import styled, { css, type DefaultTheme } from "styled-components";
import { s } from "@shared/styles";
import { NotificationEventType, TeamPreference } from "@shared/types";
import { unicodeCLDRtoBCP47 } from "@shared/utils/date";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { actionToMenuItem } from "~/actions";
import { createCollection } from "~/actions/definitions/collections";
import { Avatar } from "~/components/Avatar";
import Button from "~/components/Button";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import InputSearchPage from "~/components/InputSearchPage";
import LanguagePrompt from "~/components/LanguagePrompt";
import { PageHeader } from "~/components/PageHeader";
import PinnedDocuments from "~/components/PinnedDocuments";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Scene from "~/components/Scene";
import Time from "~/components/Time";
import useActionContext from "~/hooks/useActionContext";
import useCurrentUser from "~/hooks/useCurrentUser";
import { usePinnedDocuments } from "~/hooks/usePinnedDocuments";
import useStores from "~/hooks/useStores";
import NewDocumentMenu from "~/menus/NewDocumentMenu";
import {
  documentPath,
  newDocumentPath,
  searchPath,
  settingsPath,
} from "~/utils/routeHelpers";

const CONTINUE_LIMIT = 3;

const ACTIVITY_LIMIT = 5;

const EVENT_FETCH_LIMIT = 100;

const FAVOURITE_LIMIT = 5;

const TEMPLATE_LIMIT = 3;

const DRAFT_LIMIT = 3;

const RECENT_SEARCH_LIMIT = 3;

const COLLECTION_DOCUMENT_LIMIT = 3;

const SUMMARY_BLOCKS = 2;

const STALE_DRAFT_DAYS = 7;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const SATURDAY = 6;

const SUNDAY = 0;

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

function previousWorkingDay() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  do {
    date.setDate(date.getDate() - 1);
  } while (date.getDay() === SATURDAY || date.getDay() === SUNDAY);
  return date;
}

function Home() {
  const {
    documents,
    events,
    notifications,
    collections,
    stars,
    templates,
    searches,
    auth,
    ui,
  } = useStores();
  const user = useCurrentUser();
  const { t } = useTranslation();
  const { pins, count } = usePinnedDocuments("home");
  const context = useActionContext({ isMenu: false, isCommandBar: false });

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
    void events.fetchPage({ limit: EVENT_FETCH_LIMIT });
    void notifications.fetchPage({ limit: 25 });
    void stars.fetchPage({ limit: 100 });
    void templates.fetchPage({ limit: 100 });
    void searches.fetchPage({ limit: 25 });
  }, [documents, events, notifications, stars, templates, searches]);

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

  const locale = user.language ? unicodeCLDRtoBCP47(user.language) : undefined;
  const since = React.useMemo(previousWorkingDay, []);

  const continueReading = documents.recentlyViewed.slice(0, CONTINUE_LIMIT);

  const mentions = notifications.active.filter(
    (notification) =>
      MENTION_EVENTS.includes(notification.event) && !notification.viewedAt
  );

  const drafts = documents.drafts({});

  const staleDrafts = drafts.filter(
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

  const workspaceEvents = events.orderedData.filter(
    (event) => !!event.documentId
  );
  const activity = workspaceEvents.slice(0, ACTIVITY_LIMIT);
  const changedCount = workspaceEvents.filter(
    (event) => new Date(event.createdAt) >= since
  ).length;

  const favourites = stars.orderedData
    .flatMap((star) => (star.document ? [star.document] : []))
    .slice(0, FAVOURITE_LIMIT);

  const recentSearches = searches.recent.slice(0, RECENT_SEARCH_LIMIT);

  const documentCount = collections.orderedData.reduce(
    (total, collection) => total + (collection.documentCount ?? 0),
    0
  );

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
  const isStartHereDone =
    startHereItems.length > 0 && completedCount === startHereItems.length;
  const hasStartHere =
    !!onboardingCollection &&
    startHereItems.length > 0 &&
    !(isStartHereDone && ui.startHereDismissed);

  const isQuiet = attentionCount === 0 && activity.length === 0;

  const today = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const sinceDay = new Intl.DateTimeFormat(locale, {
    weekday: "long",
  }).format(since);

  const newCollection = actionToMenuItem(createCollection, context);
  const canCreateCollection =
    newCollection.type === "button" && newCollection.visible;

  const startHereDescription = onboardingCollection?.data
    ? ProsemirrorDataHelper.toPlainText(onboardingCollection.data).trim()
    : "";

  const hasRail =
    hasStartHere ||
    favourites.length > 0 ||
    templates.all.length > 0 ||
    drafts.length > 0;

  return (
    <Scene measure="index" icon={<HomeIcon />} title={t("Home")}>
      <ResizingHeightContainer>
        {!ui.languagePromptDismissed && <LanguagePrompt key="language" />}
      </ResizingHeightContainer>

      <Page>
        <PageHeader
          title={t("Home")}
          caption={
            <>
              {today}
              {" · "}
              {changedCount
                ? t("{{ count }} things changed since {{ day }}", {
                    count: changedCount,
                    day: sinceDay,
                  })
                : t("nothing changed since {{ day }}", { day: sinceDay })}
            </>
          }
          actions={
            <>
              {templates.all.length > 0 && (
                <Button neutral as={Link} to={settingsPath("templates")}>
                  {t("Templates")}
                </Button>
              )}
              <NewDocumentMenu />
            </>
          }
        />

        <SearchRow>
          <InputSearchPage
            source="home"
            label={t("Search")}
            labelHidden
            placeholder={t("Search in {{ number }} documents", {
              number: documentCount,
            })}
          />
        </SearchRow>
        {recentSearches.length > 0 && (
          <RecentSearches>
            {recentSearches.map((search) => (
              <SearchPill
                key={search.id}
                to={searchPath({ query: search.query, ref: "home" })}
              >
                {search.query}
              </SearchPill>
            ))}
            <RecentSearchLabel>{t("recent searches")}</RecentSearchLabel>
          </RecentSearches>
        )}

        <PinnedDocuments
          pins={pins}
          placeholderCount={count}
          collapseKey="home"
        />

        <Grid $withRail={hasRail}>
          <Main>
            <Module>
              <ModuleLabel>{t("Continue")}</ModuleLabel>
              {continueReading.length ? (
                <Cards>
                  {continueReading.map((document) => (
                    <Card key={document.id} to={documentPath(document)}>
                      <CardTitle>{document.titleWithDefault}</CardTitle>
                      <CardExcerpt>
                        {ProsemirrorDataHelper.toPlainText(
                          document.getSummary(SUMMARY_BLOCKS)
                        )}
                      </CardExcerpt>
                      <CardMeta>
                        {document.collection?.name}
                        {document.collection && " · "}
                        {document.isDraft ? (
                          t("draft open")
                        ) : (
                          <Time
                            dateTime={document.updatedAt}
                            addSuffix
                            shorten
                          />
                        )}
                      </CardMeta>
                    </Card>
                  ))}
                </Cards>
              ) : (
                <EmptyLine>{t("Nothing opened yet")}</EmptyLine>
              )}
            </Module>

            {isQuiet ? (
              <QuietLine>
                {t("Nothing needs you and nobody has edited anything")}
              </QuietLine>
            ) : (
              <>
                {attentionCount > 0 && (
                  <Module>
                    <ModuleLabel>
                      {t("Needs you")}
                      <Pill>{attentionCount}</Pill>
                    </ModuleLabel>
                    <div>
                      {mentions.map((notification) => (
                        <AttentionRow key={notification.id}>
                          {notification.actor ? (
                            <Avatar model={notification.actor} size={24} />
                          ) : (
                            <Dot $tone="mention" />
                          )}
                          <RowBody>
                            <RowTitle>
                              <RowName>{notification.subject}</RowName>
                            </RowTitle>
                            <RowWhy>
                              <Time
                                dateTime={notification.createdAt}
                                addSuffix
                                shorten
                              />
                            </RowWhy>
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
                            <RowTitle>
                              <RowName>{document.titleWithDefault}</RowName>
                            </RowTitle>
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
                          <RowIcon>
                            <DocumentIcon size={16} outline />
                          </RowIcon>
                          <RowBody>
                            <RowTitle>
                              <RowName>{draft.titleWithDefault}</RowName>
                            </RowTitle>
                            <RowWhy>
                              {t("Draft not updated in over a week")}
                            </RowWhy>
                          </RowBody>
                          <RowAction to={documentPath(draft)}>
                            {t("Publish")}
                          </RowAction>
                        </AttentionRow>
                      ))}
                    </div>
                  </Module>
                )}

                {activity.length > 0 && (
                  <Module>
                    <ModuleLabel>{t("Changed in workspace")}</ModuleLabel>
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
                            <Time
                              dateTime={event.createdAt}
                              addSuffix
                              shorten
                            />
                          </RowTime>
                        </ActivityRow>
                      ))}
                    </div>
                  </Module>
                )}
              </>
            )}

            <Module>
              <ModuleLabel>{t("Your collections")}</ModuleLabel>
              <CollectionGrid>
                {collections.orderedData.map((collection) => (
                  <CollectionCard key={collection.id} to={collection.path}>
                    <CollectionHead>
                      <CollectionIcon collection={collection} size={18} />
                      <CollectionName>{collection.name}</CollectionName>
                      {collection.documentCount !== undefined && (
                        <CollectionCount>
                          {collection.documentCount}
                        </CollectionCount>
                      )}
                    </CollectionHead>
                    {collection.sortedDocuments
                      ?.slice(0, COLLECTION_DOCUMENT_LIMIT)
                      .map((node) => (
                        <CollectionDocument key={node.id}>
                          {node.title || t("Untitled")}
                        </CollectionDocument>
                      ))}
                    <CollectionMeta>
                      {t("updated")}{" "}
                      <Time dateTime={collection.updatedAt} addSuffix shorten />
                    </CollectionMeta>
                  </CollectionCard>
                ))}
                {canCreateCollection && newCollection.type === "button" && (
                  <NewCollectionCard onClick={newCollection.onClick}>
                    <PlusIcon size={18} />
                    {t("New collection")}
                  </NewCollectionCard>
                )}
              </CollectionGrid>
            </Module>
          </Main>

          {hasRail && (
            <Rail>
              {favourites.length > 0 && (
                <RailCard>
                  <ModuleLabel>{t("Favorites")}</ModuleLabel>
                  {favourites.map((document) => (
                    <RailRow key={document.id} to={documentPath(document)}>
                      {document.titleWithDefault}
                    </RailRow>
                  ))}
                </RailCard>
              )}

              {templates.all.length > 0 && (
                <RailCard>
                  <ModuleLabel>{t("Start from")}</ModuleLabel>
                  {templates.all.slice(0, TEMPLATE_LIMIT).map((template) => (
                    <RailRow
                      key={template.id}
                      to={newDocumentPath(template.collectionId, {
                        templateId: template.id,
                      })}
                    >
                      {template.titleWithDefault}
                    </RailRow>
                  ))}
                  <RailFooterLink to={settingsPath("templates")}>
                    {t("See all templates")}
                  </RailFooterLink>
                </RailCard>
              )}

              {drafts.length > 0 && (
                <RailCard>
                  <ModuleLabel>
                    {t("{{ count }} drafts", { count: drafts.length })}
                  </ModuleLabel>
                  {drafts.slice(0, DRAFT_LIMIT).map((draft) => (
                    <RailDraft key={draft.id} to={documentPath(draft)}>
                      <RailDraftTitle>{draft.titleWithDefault}</RailDraftTitle>
                      <RailNote>
                        {t("edited")}{" "}
                        <Time dateTime={draft.updatedAt} addSuffix shorten />
                      </RailNote>
                    </RailDraft>
                  ))}
                </RailCard>
              )}

              {hasStartHere &&
                (isStartHereDone ? (
                  <DoneLine>
                    <DoneDot />
                    <DoneText>
                      {t("Start here")}
                      {" · "}
                      {t("{{ completed }} of {{ total }} completed", {
                        completed: completedCount,
                        total: startHereItems.length,
                      })}
                    </DoneText>
                    <DismissButton
                      onClick={() => ui.set({ startHereDismissed: true })}
                    >
                      {t("Dismiss")}
                    </DismissButton>
                  </DoneLine>
                ) : (
                  <RailCard>
                    <ModuleLabel>{t("Start here")}</ModuleLabel>
                    {startHereDescription && (
                      <StartHereDescription>
                        {startHereDescription}
                      </StartHereDescription>
                    )}
                    <StartHereList>
                      {startHereItems.map((item, index) => (
                        <StartHereItem
                          key={item.id}
                          to={item.url}
                          $completed={item.completed}
                        >
                          <Marker
                            $completed={item.completed}
                            $next={index === nextIndex}
                          />
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
                          width: `${
                            (completedCount / startHereItems.length) * 100
                          }%`,
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
                ))}
            </Rail>
          )}
        </Grid>
      </Page>
    </Scene>
  );
}

const Page = styled.div`
  max-width: 1000px;
  margin: 0 auto;
`;

const cardSurface = css`
  border: 1px solid ${(props) => transparentize(0.5, props.theme.divider)};
  border-radius: 10px;
  box-shadow: ${(props) =>
    props.theme.isDark ? "none" : "0 1px 2px rgba(16, 24, 40, 0.04)"};
`;

const rowDivider = css`
  border-bottom: 1px solid
    ${(props) => transparentize(0.6, props.theme.divider)};

  &:last-child {
    border-bottom: 0;
  }
`;

const SearchRow = styled.div`
  margin-bottom: 10px;

  > * {
    max-width: 100%;
  }
`;

const RecentSearches = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 28px;
`;

const SearchPill = styled(Link)`
  padding: 4px 11px;
  border: 1px solid ${s("divider")};
  border-radius: 14px;
  font-size: 13px;
  color: ${s("textSecondary")};

  &:hover {
    background: ${s("listItemHoverBackground")};
    color: ${s("text")};
  }
`;

const RecentSearchLabel = styled.span`
  font-size: 13px;
  color: ${s("textTertiary")};
`;

const Grid = styled.div<{ $withRail: boolean }>`
  display: grid;
  grid-template-columns: ${(props) =>
    props.$withRail ? "minmax(0, 1fr) 260px" : "minmax(0, 1fr)"};
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

const QuietLine = styled.p`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 32px;
  padding: 13px 15px;
  border-radius: 9px;
  background: ${s("backgroundSecondary")};
  color: ${s("textSecondary")};
  font-size: 14px;

  &::before {
    content: "";
    flex: 0 0 7px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${s("textTertiary")};
  }
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
`;

const Card = styled(Link)`
  ${cardSurface}
  display: block;
  padding: 13px 15px;
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

const CardExcerpt = styled.p`
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 6px 0 10px;
  font-size: 13px;
  line-height: 1.45;
  color: ${s("textSecondary")};
`;

const CardMeta = styled.div`
  font-size: 12.5px;
  color: ${s("textTertiary")};
`;

const AttentionRow = styled.div`
  ${rowDivider}
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
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
  margin: 0 8px;
  border-radius: 50%;
  background: ${(props) => DOT_TONES[props.$tone](props.theme)};
`;

const RowIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${s("backgroundSecondary")};
  color: ${s("textTertiary")};
`;

const RowBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const RowTitle = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${s("text")};
`;

const RowName = styled.span`
  font-weight: 600;
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
  ${rowDivider}
  display: flex;
  gap: 11px;
  align-items: center;
  padding: 11px 0;
`;

const ActivityDocument = styled(Link)`
  font-weight: 600;
  color: ${s("text")};
`;

const CollectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;
`;

const CollectionCard = styled(Link)`
  ${cardSurface}
  display: block;
  padding: 13px 15px;
  color: inherit;

  &:hover {
    background: ${s("listItemHoverBackground")};
  }
`;

const CollectionHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const CollectionName = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  color: ${s("text")};
`;

const CollectionCount = styled.span`
  flex-shrink: 0;
  font-size: 12.5px;
  color: ${s("textTertiary")};
`;

const CollectionDocument = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 0;
  font-size: 13.5px;
  color: ${s("textSecondary")};
`;

const CollectionMeta = styled.div`
  margin-top: 10px;
  font-size: 12.5px;
  color: ${s("textTertiary")};
`;

const NewCollectionCard = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 120px;
  padding: 13px 15px;
  border: 1px dashed ${(props) => transparentize(0.35, props.theme.divider)};
  border-radius: 10px;
  background: none;
  color: ${s("textTertiary")};
  font-size: 13.5px;
  font-family: inherit;
  cursor: var(--pointer);

  &:hover {
    border-color: ${s("inputBorderFocused")};
    color: ${s("textSecondary")};
  }
`;

const Rail = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
`;

const RailCard = styled.div`
  ${cardSurface}
  padding: 15px;
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

const DoneLine = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${s("backgroundSecondary")};
  font-size: 12px;
  color: ${s("textSecondary")};
`;

const DoneText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DoneDot = styled.span`
  flex: 0 0 7px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${s("freshText")};
`;

const DismissButton = styled.button`
  margin-inline-start: auto;
  flex-shrink: 0;
  border: 0;
  background: none;
  padding: 0;
  color: ${s("textTertiary")};
  font-size: 12px;
  font-family: inherit;
  cursor: var(--pointer);

  &:hover {
    color: ${s("text")};
  }
`;

const RailRow = styled(Link)`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 5px 0;
  font-size: 13.5px;
  color: ${s("textSecondary")};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: ${s("text")};
  }
`;

const RailFooterLink = styled(Link)`
  display: inline-block;
  margin-top: 6px;
  font-size: 13px;
  color: ${s("accent")};
`;

const RailDraft = styled(Link)`
  display: block;
  padding: 5px 0;
  color: inherit;
`;

const RailDraftTitle = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13.5px;
  color: ${s("text")};
`;

const RailNote = styled.div`
  margin-top: 2px;
  font-size: 12.5px;
  color: ${s("textTertiary")};
`;

export default observer(Home);
