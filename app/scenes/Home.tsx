import { observer } from "mobx-react";
import {
  ClockIcon,
  CommentIcon,
  EditIcon,
  HomeIcon,
  ImportIcon,
  NextIcon,
  PlusIcon,
  ShapesIcon,
  UserAddIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { type DefaultTheme } from "styled-components";
import { s } from "@shared/styles";
import { NotificationEventType, TeamPreference } from "@shared/types";
import { unicodeCLDRtoBCP47 } from "@shared/utils/date";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { actionToMenuItem } from "~/actions";
import { inviteUser } from "~/actions/definitions/users";
import {
  ActivityCollection,
  ActivityDays,
  CHIP_ICON_SIZE,
} from "~/components/ActivityFeed";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import LanguagePrompt from "~/components/LanguagePrompt";
import { PageHeader } from "~/components/PageHeader";
import PinnedDocuments from "~/components/PinnedDocuments";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Scene from "~/components/Scene";
import {
  cardHover,
  cardSurface,
  Pill,
  RailGrid,
  SectionHeading,
} from "~/components/Section";
import Time from "~/components/Time";
import useActionContext from "~/hooks/useActionContext";
import useBelowDesktop from "~/hooks/useBelowDesktop";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import { usePinnedDocuments } from "~/hooks/usePinnedDocuments";
import useStores from "~/hooks/useStores";
import NewDocumentMenu from "~/menus/NewDocumentMenu";
import { ActivityFilter, matchesActivityFilter } from "./homeActivityFilter";
import { HomeFirstRun } from "./HomeFirstRun";
import { useHomeImportAction } from "./useHomeImportAction";
import {
  documentPath,
  newDocumentPath,
  templatesPath,
} from "~/utils/routeHelpers";

const CONTINUE_LIMIT = 3;

const ACTIVITY_LIMIT = 20;

const EVENT_FETCH_LIMIT = 100;

const ONBOARDING_FETCH_LIMIT = 100;

const PERCENT = 100;

const SUMMARY_BLOCKS = 2;

const STALE_DRAFT_DAYS = 7;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const AFTERNOON_START_HOUR = 12;

const EVENING_START_HOUR = 18;

const NEW_DOCUMENT_SHORTCUT = "N";

const MENTION_EVENTS = [
  NotificationEventType.MentionedInDocument,
  NotificationEventType.MentionedInComment,
  NotificationEventType.GroupMentionedInDocument,
  NotificationEventType.GroupMentionedInComment,
  NotificationEventType.CreateComment,
];

function NeedsRow({
  to,
  icon,
  tone,
  title,
  subtitle,
}: {
  to: string;
  icon: React.ReactNode;
  tone: keyof typeof NEEDS_TONES;
  title: React.ReactNode;
  subtitle: React.ReactNode;
}) {
  return (
    <NeedsItem to={to}>
      <NeedsIcon $tone={tone}>{icon}</NeedsIcon>
      <NeedsBody>
        <NeedsTitle>{title}</NeedsTitle>
        <NeedsSubtitle>{subtitle}</NeedsSubtitle>
      </NeedsBody>
      <NextIcon size={16} />
    </NeedsItem>
  );
}

const HomeContent = observer(function HomeContent() {
  const { documents, events, notifications, collections, auth, ui } =
    useStores();
  const user = useCurrentUser();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const { t } = useTranslation();
  const belowDesktop = useBelowDesktop();
  const { pins, count } = usePinnedDocuments("home");
  const context = useActionContext({ isMenu: false, isCommandBar: false });
  const [filter, setFilter] = React.useState(ActivityFilter.All);

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
  }, [documents, events, notifications]);

  React.useEffect(() => {
    if (!onboardingCollection) {
      return;
    }
    void onboardingCollection.fetchDocuments();
    void documents.fetchPage({
      collectionId: onboardingCollection.id,
      limit: ONBOARDING_FETCH_LIMIT,
    });
  }, [documents, onboardingCollection]);

  const locale = user.language ? unicodeCLDRtoBCP47(user.language) : undefined;

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
  const startHereDescription = onboardingCollection?.data
    ? ProsemirrorDataHelper.toPlainText(onboardingCollection.data).trim()
    : "";
  const hasAside = attentionCount > 0 || hasStartHere;

  const activityEvents = events.orderedData
    .filter(
      (event) => !!event.documentId && matchesActivityFilter(event.name, filter)
    )
    .slice(0, ACTIVITY_LIMIT);

  const now = new Date();
  const greetingName = user.name.split(" ")[0];
  const greeting =
    now.getHours() < AFTERNOON_START_HOUR
      ? t("Good morning, {{ name }}", { name: greetingName })
      : now.getHours() < EVENING_START_HOUR
        ? t("Good afternoon, {{ name }}", { name: greetingName })
        : t("Good evening, {{ name }}", { name: greetingName });

  const dayFormat = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const inviteItem = actionToMenuItem(inviteUser, context);
  const { importItem, canImport } = useHomeImportAction();

  const filters = [
    { value: ActivityFilter.All, label: t("All") },
    { value: ActivityFilter.Edits, label: t("Edits") },
    { value: ActivityFilter.Comments, label: t("Comments") },
  ];

  return (
    <Scene
      measure="index"
      icon={<HomeIcon />}
      title={t("Home")}
      actions={belowDesktop ? <NewDocumentMenu /> : undefined}
    >
      <ResizingHeightContainer>
        {!ui.languagePromptDismissed && <LanguagePrompt key="language" />}
      </ResizingHeightContainer>

      <Page>
        <PageHeader
          title={greeting}
          caption={
            <>
              <Capitalized>{dayFormat.format(now)}</Capitalized>
              {attentionCount > 0 && (
                <>
                  {" · "}
                  {t("{{ count }} item needs you", { count: attentionCount })}
                </>
              )}
            </>
          }
        />

        <PinnedDocuments
          pins={pins}
          placeholderCount={count}
          collapseKey="home"
        />

        <QuickActions role="group" aria-label={t("Quick actions")}>
          {can.createDocument && (
            <QuickAction
              as={Link}
              to={newDocumentPath()}
              data-quick-action="new"
            >
              <QuickIcon $primary>
                <PlusIcon size={18} />
              </QuickIcon>
              <QuickTitle>{t("New document")}</QuickTitle>
              <QuickSubtitle>
                {t("Blank or with a structure")}
                <ShortcutHint>{NEW_DOCUMENT_SHORTCUT}</ShortcutHint>
              </QuickSubtitle>
            </QuickAction>
          )}
          {can.readTemplate && (
            <QuickAction
              as={Link}
              to={templatesPath()}
              data-quick-action="template"
            >
              <QuickIcon>
                <ShapesIcon size={18} />
              </QuickIcon>
              <QuickTitle>{t("Use a template")}</QuickTitle>
              <QuickSubtitle>
                {t("Runbook, RFC, minutes and more")}
              </QuickSubtitle>
            </QuickAction>
          )}
          {canImport && importItem.type === "button" && (
            <QuickAction
              as="button"
              type="button"
              onClick={importItem.onClick}
              data-quick-action="import"
            >
              <QuickIcon>
                <ImportIcon size={18} />
              </QuickIcon>
              <QuickTitle>{t("Import")}</QuickTitle>
              <QuickSubtitle>{t("Markdown, Word or Notion")}</QuickSubtitle>
            </QuickAction>
          )}
          {can.inviteUser && inviteItem.type === "button" && (
            <QuickAction
              as="button"
              type="button"
              onClick={inviteItem.onClick}
              data-quick-action="invite"
            >
              <QuickIcon>
                <UserAddIcon size={18} />
              </QuickIcon>
              <QuickTitle>{t("Invite people")}</QuickTitle>
              <QuickSubtitle>{t("By email or link")}</QuickSubtitle>
            </QuickAction>
          )}
        </QuickActions>

        <Section aria-labelledby="home-continue">
          <SectionHeading>
            <h2 id="home-continue">{t("Continue where you left off")}</h2>
          </SectionHeading>
          {continueReading.length ? (
            <Cards>
              {continueReading.map((document) => (
                <Card key={document.id} to={documentPath(document)}>
                  {document.collection && (
                    <ActivityCollection>
                      <CollectionIcon
                        collection={document.collection}
                        size={CHIP_ICON_SIZE}
                      />
                      {document.collection.displayName}
                    </ActivityCollection>
                  )}
                  <CardTitle>{document.displayTitle}</CardTitle>
                  <CardExcerpt>
                    {ProsemirrorDataHelper.toPlainText(
                      document.getSummary(SUMMARY_BLOCKS)
                    )}
                  </CardExcerpt>
                  <CardMeta>
                    {document.isDraft ? (
                      t("draft open")
                    ) : (
                      <>
                        {document.updatedBy?.id === user.id
                          ? t("You edited")
                          : t("You read")}{" "}
                        <Time
                          dateTime={
                            document.updatedBy?.id === user.id
                              ? document.updatedAt
                              : (document.lastViewedAt ?? document.updatedAt)
                          }
                          addSuffix
                          shorten
                        />
                      </>
                    )}
                  </CardMeta>
                </Card>
              ))}
            </Cards>
          ) : (
            <EmptyLine>{t("Nothing opened yet")}</EmptyLine>
          )}
        </Section>

        <RailGrid $withRail={hasAside}>
          <section aria-labelledby="home-activity">
            <SectionHeading>
              <h2 id="home-activity">{t("Recent activity")}</h2>
              <Segmented role="group" aria-label={t("Filter activity")}>
                {filters.map((item) => (
                  <SegmentButton
                    key={item.value}
                    type="button"
                    aria-pressed={filter === item.value}
                    $active={filter === item.value}
                    onClick={() => setFilter(item.value)}
                  >
                    {item.label}
                  </SegmentButton>
                ))}
              </Segmented>
            </SectionHeading>
            {activityEvents.length ? (
              <ActivityDays events={activityEvents} />
            ) : (
              <EmptyLine>{t("No activity yet")}</EmptyLine>
            )}
          </section>

          {hasAside && (
            <aside>
              {attentionCount > 0 && (
                <section aria-labelledby="home-needs-you">
                  <SectionHeading>
                    <h2 id="home-needs-you">
                      {t("Needs you")}
                      <Pill>{attentionCount}</Pill>
                    </h2>
                  </SectionHeading>
                  <NeedsList>
                    {mentions.map((notification) => (
                      <NeedsRow
                        key={notification.id}
                        to={notification.path ?? "/home"}
                        icon={<CommentIcon size={18} />}
                        tone="mention"
                        title={
                          notification.actor
                            ? t("Reply to {{ name }}", {
                                name: notification.actor.name,
                              })
                            : notification.subject(t)
                        }
                        subtitle={notification.subject(t)}
                      />
                    ))}
                    {needsVerification.map((document) => (
                      <NeedsRow
                        key={document.id}
                        to={documentPath(document)}
                        icon={<ClockIcon size={18} />}
                        tone="stale"
                        title={t("Review overdue")}
                        subtitle={document.displayTitle}
                      />
                    ))}
                    {staleDrafts.map((draft) => (
                      <NeedsRow
                        key={draft.id}
                        to={documentPath(draft)}
                        icon={<EditIcon size={18} />}
                        tone="draft"
                        title={t("Unpublished draft")}
                        subtitle={
                          <>
                            {draft.displayTitle}
                            {" · "}
                            <Time
                              dateTime={draft.updatedAt}
                              addSuffix
                              shorten
                            />
                          </>
                        }
                      />
                    ))}
                  </NeedsList>
                </section>
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
                  <StartHereCard>
                    <SectionHeading>
                      <h2>{t("Start here")}</h2>
                    </SectionHeading>
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
                            (completedCount / startHereItems.length) * PERCENT
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
                  </StartHereCard>
                ))}
            </aside>
          )}
        </RailGrid>
      </Page>
    </Scene>
  );
});

const Page = styled.div`
  max-width: 1080px;
  margin: 0 auto;
`;

const Capitalized = styled.span`
  display: inline-block;

  &::first-letter {
    text-transform: uppercase;
  }
`;

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 36px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const QuickAction = styled.div`
  ${cardSurface}
  ${cardHover}
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: var(--pointer);
`;

const QuickIcon = styled.span<{ $primary?: boolean }>`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: ${(props) =>
    props.$primary ? props.theme.accent : props.theme.listItemHoverBackground};
  color: ${(props) =>
    props.$primary ? props.theme.accentText : props.theme.textSecondary};
  fill: currentColor;
`;

const QuickTitle = styled.span`
  font-weight: 500;
  color: ${s("text")};
`;

const QuickSubtitle = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: -6px;
  font-size: 13px;
  line-height: 18px;
  color: ${s("textTertiary")};
`;

const ShortcutHint = styled.kbd`
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 5px;
  border: 1px solid ${s("divider")};
  border-radius: 4px;
  font: 500 11px/1 ${s("fontFamily")};
  color: ${s("textTertiary")};
`;

const Section = styled.section`
  margin-bottom: 36px;
`;

const EmptyLine = styled.p`
  margin: 0;
  color: ${s("textTertiary")};
  font-size: 14px;
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Card = styled(Link)`
  ${cardSurface}
  ${cardHover}
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px 16px;
  color: inherit;
`;

const CardTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: ${s("text")};
`;

const CardExcerpt = styled.p`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
  font-size: 13px;
  line-height: 19px;
  color: ${s("textSecondary")};
`;

const CardMeta = styled.div`
  margin-top: auto;
  padding-top: 4px;
  font-size: 12px;
  color: ${s("textTertiary")};
`;

const Segmented = styled.div`
  display: inline-flex;
  padding: 2px;
  border: 1px solid ${s("divider")};
  border-radius: 6px;
  background: ${s("sidebarBackground")};
`;

const SegmentButton = styled.button<{ $active: boolean }>`
  height: 26px;
  padding: 0 10px;
  border: 0;
  border-radius: 4px;
  background: ${(props) =>
    props.$active ? props.theme.background : "transparent"};
  box-shadow: ${(props) =>
    props.$active ? `0 0 0 1px ${props.theme.divider}` : "none"};
  color: ${(props) =>
    props.$active ? props.theme.text : props.theme.textTertiary};
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: var(--pointer);
`;

const NEEDS_TONES = {
  mention: (theme: DefaultTheme) => theme.link,
  stale: (theme: DefaultTheme) => theme.warning,
  draft: (theme: DefaultTheme) => theme.textSecondary,
};

const NeedsList = styled.div`
  ${cardSurface}
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
`;

const NeedsItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 6px;
  color: ${s("textTertiary")};

  &:hover {
    background: ${s("listItemHoverBackground")};
  }
`;

const NeedsIcon = styled.span<{ $tone: keyof typeof NEEDS_TONES }>`
  display: grid;
  flex: none;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: ${s("listItemHoverBackground")};
  color: ${(props) => NEEDS_TONES[props.$tone](props.theme)};
  fill: currentColor;
`;

const NeedsBody = styled.span`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
`;

const NeedsTitle = styled.span`
  font-weight: 500;
  color: ${s("text")};
`;

const NeedsSubtitle = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 18px;
  color: ${s("textTertiary")};
`;

const StartHereCard = styled.section`
  ${cardSurface}
  margin-top: 20px;
  padding: 12px 16px 16px;
`;

const StartHereDescription = styled.p`
  margin: -4px 0 12px;
  font-size: 13px;
  line-height: 19px;
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
  min-height: 30px;
  padding: 5px 0;
  font-size: 14px;
  color: ${(props) =>
    props.$completed ? props.theme.textTertiary : props.theme.textSecondary};

  @media (max-width: 768px), (hover: none) {
    min-height: 44px;
  }

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
          props.$next ? props.theme.link : props.theme.divider
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
  background: ${s("link")};
`;

const ProgressLine = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  color: ${s("textTertiary")};
`;

const DoneLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
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
  flex-shrink: 0;
  margin-inline-start: auto;
  padding: 0;
  border: 0;
  background: none;
  color: ${s("textTertiary")};
  font: inherit;
  font-size: 12px;
  cursor: var(--pointer);

  &:hover {
    color: ${s("text")};
  }
`;

function Home() {
  const { documents } = useStores();
  const { t } = useTranslation();
  const hasDocuments = documents.all.length > 0;
  const [isWorkspaceEmpty, setIsWorkspaceEmpty] = React.useState<
    boolean | undefined
  >();

  React.useEffect(() => {
    if (hasDocuments) {
      return;
    }
    let ignore = false;
    documents
      .fetchPage({ limit: 1 })
      .then((results) => !ignore && setIsWorkspaceEmpty(results.length === 0))
      .catch(() => !ignore && setIsWorkspaceEmpty(false));

    return () => {
      ignore = true;
    };
  }, [documents, hasDocuments]);

  if (hasDocuments || isWorkspaceEmpty === false) {
    return <HomeContent />;
  }
  if (isWorkspaceEmpty === undefined) {
    return <Scene measure="index" icon={<HomeIcon />} title={t("Home")} />;
  }
  return <HomeFirstRun />;
}

export default observer(Home);
