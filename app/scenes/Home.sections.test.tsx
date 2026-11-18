import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import { TeamPreference } from "@shared/types";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import Home from "./Home";
import { ActivityFilter, matchesActivityFilter } from "./homeActivityFilter";

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const COLLECTION_ID = "collection-1";
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;
const STALE_DRAFT_AGE_DAYS = 10;
const EDIT_TITLE = "Runbook latency";
const COMMENT_TITLE = "GitHub integration";
const PUBLISH_TITLE = "Event queue RFC";
const YESTERDAY_TITLE = "Roadmap 2027";
const DRAFT_TITLE = "Retro notes";
const CONTINUE_TITLE = "Recently opened";

const staleDraft = {
  id: "doc-draft",
  title: DRAFT_TITLE,
  data: ProsemirrorDataHelper.getEmpty(),
  publishedAt: null,
  updatedAt: new Date(
    Date.now() - STALE_DRAFT_AGE_DAYS * MILLISECONDS_PER_DAY
  ).toISOString(),
};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function seedStores(abilities: Record<string, boolean>) {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.mocked(client.post).mockImplementation(async (url: string) => ({
    data: url === "/documents.drafts" ? [staleDraft] : [],
    policies: [],
    pagination: {},
  }));
  stores.users.clear();
  stores.documents.clear();
  stores.events.clear();
  stores.collections.clear();
  stores.policies.clear();
  stores.users.add({ id: USER_ID, name: "Marina Lopes" });
  stores.auth.add({ id: TEAM_ID, name: "Omni" });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
  });
  stores.policies.add({ id: TEAM_ID, abilities });
  stores.collections.add({
    id: COLLECTION_ID,
    name: "Engineering",
    color: "#4f6ef7",
  });
}

function addEvent(
  id: string,
  name: string,
  title: string,
  hoursAgo: number,
  documentId = `doc-${id}`
) {
  stores.events.add({
    id,
    name,
    documentId,
    collectionId: COLLECTION_ID,
    documentTitle: title,
    documentUrl: `/doc/${id}`,
    createdAt: new Date(
      Date.now() - hoursAgo * MILLISECONDS_PER_HOUR
    ).toISOString(),
  });
}

function seedActivity() {
  addEvent("e1", "revisions.create", EDIT_TITLE, 0);
  addEvent("e2", "comments.create", COMMENT_TITLE, 0);
  addEvent("e3", "documents.publish", PUBLISH_TITLE, 0);
  addEvent("e4", "revisions.create", YESTERDAY_TITLE, 24);
}

function addPublishedDocument() {
  stores.documents.add({
    id: "doc-published",
    title: CONTINUE_TITLE,
    data: ProsemirrorDataHelper.getEmpty(),
    collectionId: COLLECTION_ID,
    publishedAt: new Date().toISOString(),
  });
}

function renderHome() {
  return render(
    <Provider rootStore={stores}>
      <ThemeProvider theme={light}>
        <MemoryRouter initialEntries={["/home"]}>
          <ActionContextProvider>
            <Home />
          </ActionContextProvider>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

function isBefore(first: HTMLElement, second: HTMLElement) {
  return !!(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING
  );
}

describe("Home sections", () => {
  beforeEach(() => {
    seedStores({
      createDocument: true,
      createPersonalCollection: true,
      inviteUser: true,
      readTemplate: true,
    });
    stores.documents.add({
      id: "doc-continue",
      title: CONTINUE_TITLE,
      data: ProsemirrorDataHelper.getEmpty(),
      collectionId: COLLECTION_ID,
      lastViewedAt: new Date().toISOString(),
    });
    stores.documents.add({ ...staleDraft, publishedAt: undefined });
    seedActivity();
  });

  it("R09 renders the sections in board order", () => {
    renderHome();
    const quickActions = screen.getByRole("group", { name: "Quick actions" });
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    const [resume, activity, needsYou] = [
      screen.getByRole("heading", { name: "Continue where you left off" }),
      screen.getByRole("heading", { name: "Recent activity" }),
      screen.getByRole("heading", { name: /Needs you/ }),
    ];

    expect(headings).toHaveLength(3);
    expect(isBefore(quickActions, resume)).toBe(true);
    expect(isBefore(resume, activity)).toBe(true);
    expect(isBefore(activity, needsYou)).toBe(true);
  });

  it("R09 greets the user by first name", () => {
    renderHome();
    expect(screen.getByText(/, Marina$/)).toBeTruthy();
  });

  it("R09 renders the four quick actions", () => {
    renderHome();
    const group = screen.getByRole("group", { name: "Quick actions" });
    const names = Array.from(group.querySelectorAll("[data-quick-action]")).map(
      (action) => action.getAttribute("data-quick-action")
    );

    expect(names).toEqual(["new", "template", "import", "invite"]);
  });

  it("R09 hides Invite people when the user cannot invite", () => {
    seedStores({
      createDocument: true,
      createPersonalCollection: true,
      readTemplate: true,
    });
    addPublishedDocument();
    renderHome();
    expect(screen.queryByText("Invite people")).toBeNull();
    expect(screen.getByText("New document")).toBeTruthy();
  });

  it("R09 renders no collection cards or repeated sidebar rails", () => {
    renderHome();
    expect(screen.queryByText("Your collections")).toBeNull();
    expect(screen.queryByText("Changed in workspace")).toBeNull();
    expect(screen.queryByText("Start from")).toBeNull();
    expect(screen.queryByText("Favorites")).toBeNull();
  });

  it("R09 hides Needs you when nothing needs the user", () => {
    stores.documents.clear();
    addPublishedDocument();
    vi.mocked(client.post).mockResolvedValue({ data: [], pagination: {} });
    renderHome();
    expect(screen.getByRole("group", { name: "Quick actions" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Needs you/ })).toBeNull();
  });

  it("R09 lists a stale draft under Needs you with the count", async () => {
    renderHome();
    const heading = await screen.findByRole("heading", { name: /Needs you/ });

    expect(heading.textContent).toContain("1");
    expect(screen.getByText(DRAFT_TITLE, { exact: false })).toBeTruthy();
  });

  it("R09 groups activity by day", () => {
    renderHome();
    const today = screen.getByRole("heading", { name: "Today" });
    const yesterday = screen.getByRole("heading", { name: "Yesterday" });

    expect(isBefore(today, screen.getByText(EDIT_TITLE))).toBe(true);
    expect(isBefore(screen.getByText(EDIT_TITLE), yesterday)).toBe(true);
    expect(isBefore(yesterday, screen.getByText(YESTERDAY_TITLE))).toBe(true);
  });

  it("R09 shows an activity event added after the first render", async () => {
    renderHome();
    expect(screen.queryByText("Late arrival")).toBeNull();
    runInAction(() => addEvent("late", "revisions.create", "Late arrival", 0));

    expect(await screen.findByText("Late arrival")).toBeTruthy();
  });

  it("R03 Tudo shows every event", () => {
    renderHome();
    [EDIT_TITLE, COMMENT_TITLE, PUBLISH_TITLE, YESTERDAY_TITLE].forEach(
      (title) => expect(screen.getByText(title)).toBeTruthy()
    );
  });

  it("R03 Comentários shows only comment events", async () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Comments" }));

    await waitFor(() => expect(screen.queryByText(EDIT_TITLE)).toBeNull());
    expect(screen.getByText(COMMENT_TITLE)).toBeTruthy();
    expect(screen.queryByText(PUBLISH_TITLE)).toBeNull();
  });

  it("R03 Edições shows only edit events", async () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Edits" }));

    await waitFor(() => expect(screen.queryByText(COMMENT_TITLE)).toBeNull());
    expect(screen.getByText(EDIT_TITLE)).toBeTruthy();
    expect(screen.getByText(YESTERDAY_TITLE)).toBeTruthy();
  });

  it("R03 marks the active filter as pressed", async () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Comments" }));

    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Comments" })
          .getAttribute("aria-pressed")
      ).toBe("true")
    );
    expect(
      screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed")
    ).toBe("false");
  });

  it("R03 Tudo again restores every event", async () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Comments" }));
    await waitFor(() => expect(screen.queryByText(EDIT_TITLE)).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "All" }));

    await waitFor(() => expect(screen.getByText(EDIT_TITLE)).toBeTruthy());
  });
});

describe("Home side column and own rows", () => {
  beforeEach(() => {
    seedStores({ createDocument: true });
    seedActivity();
    addPublishedDocument();
  });

  it("R09 shows Start here in the side column when an onboarding collection is set", () => {
    stores.collections.add({
      id: "onboarding",
      name: "Onboarding",
      sort: { field: "index", direction: "asc" },
      documents: [
        { id: "doc-a", title: "Welcome", url: "/doc/a", children: [] },
      ],
    });
    stores.auth.add({
      id: TEAM_ID,
      name: "Omni",
      preferences: { [TeamPreference.OnboardingCollectionId]: "onboarding" },
    });
    renderHome();

    const aside = screen.getByText("Start here").closest("aside");

    expect(aside).toBeTruthy();
    expect(screen.getByText("Welcome")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Needs you/ })).toBeNull();
  });

  it("R03 labels the current user's own rows as You", () => {
    stores.events.add({
      id: "own",
      name: "documents.publish",
      documentId: "doc-own",
      actorId: USER_ID,
      documentTitle: "Mine",
      documentUrl: "/doc/own",
      createdAt: new Date().toISOString(),
    });
    renderHome();

    expect(screen.getByText("You")).toBeTruthy();
    expect(screen.queryByText("Marina Lopes")).toBeNull();
  });
});

describe("matchesActivityFilter", () => {
  it("R03 matches comment events only for Comentários", () => {
    expect(
      matchesActivityFilter("comments.create", ActivityFilter.Comments)
    ).toBe(true);
    expect(
      matchesActivityFilter("revisions.create", ActivityFilter.Comments)
    ).toBe(false);
  });

  it("R03 matches document edits only for Edições", () => {
    expect(
      matchesActivityFilter("revisions.create", ActivityFilter.Edits)
    ).toBe(true);
    expect(
      matchesActivityFilter("documents.update", ActivityFilter.Edits)
    ).toBe(true);
    expect(matchesActivityFilter("comments.create", ActivityFilter.Edits)).toBe(
      false
    );
  });

  it("R03 matches everything for Tudo", () => {
    expect(
      matchesActivityFilter("collections.create", ActivityFilter.All)
    ).toBe(true);
  });
});
