import { render, screen, waitFor, within } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import Home from "./Home";

const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const TEAM_ID = "team-1";
const COLLECTION_ID = "collection-1";
const TEMPLATE_ID = "template-1";
const TEMPLATE_TITLE = "Incident runbook";
const TEMPLATE_TEXT = "Symptoms and mitigation";
const TEMPLATE_LIMIT = 4;
const EXTRA_TEMPLATES = 2;

const CREATOR_ABILITIES = {
  createDocument: true,
  createCollection: true,
  createPersonalCollection: true,
  inviteUser: true,
  readTemplate: true,
};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function mockApi(documents: Record<string, unknown>[] = []) {
  vi.mocked(client.post).mockImplementation(async (url: string) => ({
    data: url === "/documents.list" ? documents : [],
    policies: [],
    pagination: {},
  }));
}

function seedStores(abilities: Record<string, boolean>) {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  stores.users.clear();
  stores.documents.clear();
  stores.events.clear();
  stores.collections.clear();
  stores.templates.clear();
  stores.policies.clear();
  stores.users.add({ id: USER_ID, name: "Marina Lopes" });
  stores.auth.add({ id: TEAM_ID, name: "Omni Tous" });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
  });
  stores.policies.add({ id: TEAM_ID, abilities });
}

function addTemplate(id: string, title: string) {
  stores.templates.add({
    id,
    title,
    publishedAt: new Date().toISOString(),
    collectionId: null,
    data: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: TEMPLATE_TEXT }],
        },
      ],
    },
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

async function findFirstRun() {
  return screen.findByRole("heading", {
    level: 1,
    name: "Welcome to Omni Tous, Marina",
  });
}

describe("Home first run", () => {
  beforeEach(() => {
    vi.mocked(client.post).mockClear();
    seedStores(CREATOR_ABILITIES);
    mockApi();
  });

  it("R09 renders the first-run steps when the workspace has no documents", async () => {
    renderHome();
    await findFirstRun();

    expect(screen.getByText("Set up the workspace")).toBeTruthy();
    expect(screen.getByText("Create the first collection")).toBeTruthy();
    expect(screen.getByText("Invite the team")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Quick actions" })).toBeNull();
    expect(
      screen.getByText(/2 steps left to get the workspace ready\./)
    ).toBeTruthy();

    const progress = screen.getByRole("progressbar");
    expect(progress.getAttribute("aria-valuenow")).toBe("1");
    expect(progress.getAttribute("aria-valuemax")).toBe("3");
    expect(screen.getByText("1 of 3 done")).toBeTruthy();
  });

  it("R09 shows the board actions to a user who can create", async () => {
    addTemplate(TEMPLATE_ID, TEMPLATE_TITLE);
    renderHome();
    await findFirstRun();

    expect(
      screen.getByRole("button", { name: "Create collection" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Import files" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invite people" })).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Import from Markdown, Word or Notion",
      })
    ).toBeTruthy();

    const card = screen.getByRole("link", { name: new RegExp(TEMPLATE_TITLE) });
    expect(card.getAttribute("href")).toBe(
      `/doc/new?templateId=${TEMPLATE_ID}`
    );
    expect(within(card).getByText(TEMPLATE_TEXT)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "View all templates" })
        .getAttribute("href")
    ).toBe("/templates");
  });

  it("R09 limits the template cards to four", async () => {
    for (let index = 0; index < TEMPLATE_LIMIT + EXTRA_TEMPLATES; index++) {
      addTemplate(`template-${index}`, `Template ${index}`);
    }
    renderHome();
    await findFirstRun();

    expect(screen.getAllByRole("link", { name: /^Template \d/ })).toHaveLength(
      TEMPLATE_LIMIT
    );
  });

  it("R09 hides the template section when there are no templates", async () => {
    renderHome();
    await findFirstRun();

    expect(
      screen.queryByRole("heading", { name: "Start with a template" })
    ).toBeNull();
  });

  it("R09 marks the steps done from real workspace data", async () => {
    stores.collections.add({ id: COLLECTION_ID, name: "Engineering" });
    stores.users.add({ id: OTHER_USER_ID, name: "Rafael Souza" });
    renderHome();
    await findFirstRun();

    expect(screen.getByText("3 of 3 done")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Create collection" })
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Invite people" })).toBeNull();
    expect(screen.queryByText(/steps? left/)).toBeNull();
  });

  it("R09 hides create, import and invite actions from a read-only user", async () => {
    seedStores({});
    addTemplate(TEMPLATE_ID, TEMPLATE_TITLE);
    renderHome();
    await findFirstRun();

    expect(screen.getByText("Create the first collection")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(
      screen.queryByRole("link", { name: new RegExp(TEMPLATE_TITLE) })
    ).toBeNull();
  });

  it("R09 never shows the regular Home before the first-run for an empty workspace", async () => {
    renderHome();

    expect(screen.queryByRole("group", { name: "Quick actions" })).toBeNull();
    expect(screen.queryByText("Good morning, Marina")).toBeNull();

    await findFirstRun();

    expect(screen.queryByRole("group", { name: "Quick actions" })).toBeNull();
    expect(
      vi
        .mocked(client.post)
        .mock.calls.filter(([url]) => url === "/documents.list")
    ).toHaveLength(1);
  });

  it("R09 shows the regular Home at once when the store already has documents", () => {
    stores.documents.add({
      id: "doc-1",
      title: "Existing document",
      data: ProsemirrorDataHelper.getEmpty(),
      publishedAt: new Date().toISOString(),
    });
    renderHome();

    expect(screen.getByRole("group", { name: "Quick actions" })).toBeTruthy();
    expect(screen.queryByText(/^Welcome to/)).toBeNull();
    expect(
      vi
        .mocked(client.post)
        .mock.calls.some(
          ([url, data]) =>
            url === "/documents.list" &&
            (data as { limit?: number } | undefined)?.limit === 1
        )
    ).toBe(false);
  });

  it("R09 keeps the regular Home when the workspace has documents", async () => {
    mockApi([
      {
        id: "doc-1",
        title: "Existing document",
        data: ProsemirrorDataHelper.getEmpty(),
        publishedAt: new Date().toISOString(),
      },
    ]);
    renderHome();

    await waitFor(() => expect(stores.documents.get("doc-1")).toBeTruthy());
    expect(
      await screen.findByRole("group", { name: "Quick actions" })
    ).toBeTruthy();
    expect(screen.queryByText(/^Welcome to/)).toBeNull();
  });
});
