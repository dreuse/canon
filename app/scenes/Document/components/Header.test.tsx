import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { runInAction } from "mobx";
import { useLayoutEffect } from "react";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { vi } from "vitest";
import { light } from "@shared/styles/theme";
import { UserRole } from "@shared/types";
import {
  DocumentContextProvider,
  useDocumentContext,
} from "~/components/DocumentContext";
import type { ConnectionStatus } from "~/utils/multiplayer/CollaborationProvider";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { FONT_SCALE_DEFAULT, FONT_SCALE_STEP } from "~/stores/UiStore";
import { client } from "~/utils/ApiClient";
import DocumentHeader from "./Header";

const DESKTOP_WIDTH = 1280;
const MEASURED_SIZE = { width: DESKTOP_WIDTH, height: 0 };
const USER_ID = "user-1";
const TEAM_ID = "team-1";
const DOCUMENT_ID = "document-4";
const PARENT_DOCUMENT_ID = "document-3";
const COLLECTION_ID = "collection-1";
const PUBLISHED_AT = "2026-01-01T00:00:00.000Z";
const ANCESTOR_TITLES = ["Level one", "Level two", "Level three"];
const DOCUMENT_TITLE = "Current document";
const COLLECTION_NAME = "Engineering";
const PRIMARY_SELECTOR = '[data-variant="primary"]';
const DECREASE_LABEL = "Decrease text size";
const INCREASE_LABEL = "Increase text size";

vi.mock("react-use-measure", () => ({
  default: () => [() => undefined, MEASURED_SIZE],
}));

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

interface RenderOptions {
  isDraft?: boolean;
  isEditing?: boolean;
  abilities?: Record<string, boolean>;
  multiplayerStatus?: ConnectionStatus;
  hasUnsyncedChanges?: boolean;
}

function SyncState({
  multiplayerStatus,
  hasUnsyncedChanges = false,
}: Pick<RenderOptions, "multiplayerStatus" | "hasUnsyncedChanges">) {
  const context = useDocumentContext();
  useLayoutEffect(() => {
    if (multiplayerStatus) {
      context.setMultiplayerStatus(multiplayerStatus);
    }
    context.setMultiplayerSyncState(hasUnsyncedChanges, true);
  }, [context, multiplayerStatus, hasUnsyncedChanges]);
  return null;
}

function seed({ isDraft = false, abilities = {} }: RenderOptions) {
  stores.clear();
  stores.users.add({ id: USER_ID, name: "Test User", role: UserRole.Admin });
  stores.auth.add({ id: TEAM_ID, name: "Test Team" });
  stores.collections.add({
    id: COLLECTION_ID,
    name: COLLECTION_NAME,
    sort: { field: "index", direction: "asc" },
    documents: [
      {
        id: "document-1",
        title: ANCESTOR_TITLES[0],
        url: "/doc/level-one-1",
        children: [
          {
            id: "document-2",
            title: ANCESTOR_TITLES[1],
            url: "/doc/level-two-2",
            children: [
              {
                id: "document-3",
                title: ANCESTOR_TITLES[2],
                url: "/doc/level-three-3",
                children: [
                  {
                    id: DOCUMENT_ID,
                    title: DOCUMENT_TITLE,
                    url: "/doc/current-document-4",
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
  ANCESTOR_TITLES.forEach((title, index) => {
    stores.documents.add({
      id: `document-${index + 1}`,
      title,
      collectionId: COLLECTION_ID,
      parentDocumentId: index ? `document-${index}` : undefined,
      publishedAt: PUBLISHED_AT,
    });
  });
  stores.documents.add({
    id: DOCUMENT_ID,
    title: DOCUMENT_TITLE,
    collectionId: COLLECTION_ID,
    parentDocumentId: PARENT_DOCUMENT_ID,
    publishedAt: isDraft ? undefined : PUBLISHED_AT,
  });
  stores.policies.add({ id: COLLECTION_ID, abilities: { readDocument: true } });
  stores.policies.add({ id: DOCUMENT_ID, abilities });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
    stores.collections.isLoaded = true;
  });
}

function renderHeader(options: RenderOptions = {}) {
  seed(options);
  const document = stores.documents.get(DOCUMENT_ID);
  if (!document) {
    throw new Error("document missing");
  }
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter>
          <ActionContextProvider value={{ activeModels: [document] }}>
            <DocumentContextProvider>
              <SyncState
                multiplayerStatus={options.multiplayerStatus}
                hasUnsyncedChanges={options.hasUnsyncedChanges}
              />
              <DocumentHeader
                document={document}
                revision={undefined}
                isDraft={!!options.isDraft}
                isEditing={!!options.isEditing}
                isSaving={false}
                isPublishing={false}
                publishingIsDisabled={false}
                savingIsDisabled={false}
                onSelectTemplate={vi.fn()}
                onSave={vi.fn()}
              />
            </DocumentContextProvider>
          </ActionContextProvider>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

function primaryButtons(container: HTMLElement) {
  return Array.from(container.querySelectorAll(PRIMARY_SELECTOR));
}

function openDocumentOptions() {
  const trigger = screen.getByRole("button", { name: "Document options" });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
}

describe("Document header", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ObserverStub);
    vi.stubGlobal("IntersectionObserver", ObserverStub);
    vi.mocked(client.post).mockResolvedValue({
      data: [],
      policies: [],
      pagination: {},
    });
  });

  afterEach(() => {
    runInAction(() => {
      stores.ui.fontScale = FONT_SCALE_DEFAULT;
    });
  });

  it("R07 renders every breadcrumb level", () => {
    renderHeader({ abilities: { update: true } });

    [COLLECTION_NAME, ...ANCESTOR_TITLES, DOCUMENT_TITLE].forEach((title) => {
      expect(screen.getByText(title)).toBeTruthy();
    });
    expect(screen.queryByText("…")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Show path to document" })
    ).toBeNull();
  });

  it("R07 lets the first breadcrumb shrink after the others", () => {
    renderHeader({ abilities: { update: true } });

    const crumbs = screen
      .getByText(COLLECTION_NAME)
      .closest("a")?.parentElement;
    const shrink = (title: string) => {
      let crumb = screen.getByText(title);
      while (crumb.parentElement && crumb.parentElement !== crumbs) {
        crumb = crumb.parentElement;
      }
      return Number(window.getComputedStyle(crumb).flexShrink);
    };

    expect(shrink(COLLECTION_NAME)).toBeGreaterThan(0);
    expect(shrink(COLLECTION_NAME)).toBeLessThan(shrink(DOCUMENT_TITLE));
    expect(shrink(DOCUMENT_TITLE)).toBeLessThan(shrink(ANCESTOR_TITLES[1]));
  });

  it("R07 has exactly one primary button on a draft and it publishes", () => {
    const { container } = renderHeader({
      isDraft: true,
      abilities: { update: true, publish: true },
    });

    const primary = primaryButtons(container);
    expect(primary).toHaveLength(1);
    expect(primary[0].textContent).toBe("Publish");
  });

  it("R07 has no primary button on a published document", () => {
    const { container } = renderHeader({
      abilities: { update: true, share: true },
    });

    expect(primaryButtons(container)).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Share" })).toBeTruthy();
  });

  it("R07 has no primary button while editing a published document", () => {
    const { container } = renderHeader({
      isEditing: true,
      abilities: { update: true },
    });

    expect(screen.getByRole("button", { name: "Done editing" })).toBeTruthy();
    expect(primaryButtons(container)).toHaveLength(0);
  });

  it("R07 keeps Publish the only primary button while editing a draft", () => {
    const { container } = renderHeader({
      isDraft: true,
      isEditing: true,
      abilities: { update: true, publish: true },
    });

    expect(primaryButtons(container)).toHaveLength(1);
    expect(primaryButtons(container)[0].textContent).toBe("Publish");
  });

  it("R07 shows no Publish button to a read-only user", () => {
    const { container } = renderHeader({ isDraft: true });

    expect(screen.queryByText("Publish")).toBeNull();
    expect(primaryButtons(container)).toHaveLength(0);
  });

  it("R07 keeps text size out of the header bar", () => {
    renderHeader({ abilities: { update: true } });

    expect(screen.queryByRole("button", { name: DECREASE_LABEL })).toBeNull();
    expect(screen.queryByRole("button", { name: INCREASE_LABEL })).toBeNull();
  });

  it("R07 changes the text size from Mais ações", async () => {
    renderHeader({ abilities: { update: true } });
    openDocumentOptions();

    const menu = await screen.findByRole("menu");
    const increase = within(menu).getByRole("menuitem", {
      name: INCREASE_LABEL,
    });
    expect(
      within(menu).getByRole("menuitem", { name: DECREASE_LABEL })
    ).toBeTruthy();

    fireEvent.click(increase);

    expect(stores.ui.fontScale).toBeCloseTo(
      FONT_SCALE_DEFAULT + FONT_SCALE_STEP
    );
  });

  it("R07 offers text size to a read-only user", async () => {
    renderHeader();
    openDocumentOptions();

    const menu = await screen.findByRole("menu");
    expect(
      within(menu).getByRole("menuitem", { name: INCREASE_LABEL })
    ).toBeTruthy();
  });

  it("R07 keeps the menu open after changing the text size", async () => {
    renderHeader({ abilities: { update: true } });
    openDocumentOptions();

    const menu = await screen.findByRole("menu");
    fireEvent.click(
      within(menu).getByRole("menuitem", { name: INCREASE_LABEL })
    );

    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("R07 shows Saved when connected and synced", () => {
    renderHeader({
      abilities: { update: true },
      multiplayerStatus: "connected",
    });

    expect(screen.getByText("Saved")).toBeTruthy();
  });

  it("R07 hides Saved while changes are unsynced", () => {
    renderHeader({
      abilities: { update: true },
      multiplayerStatus: "connected",
      hasUnsyncedChanges: true,
    });

    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("R07 labels Conversations with the open count", () => {
    renderHeader({ abilities: { update: true, comment: true } });
    act(() => {
      stores.comments.add({
        id: "comment-1",
        documentId: DOCUMENT_ID,
        data: { type: "doc", content: [] },
        createdById: USER_ID,
      });
    });

    expect(
      screen.getByRole("button", { name: "Conversations, 1 open" })
    ).toBeTruthy();
  });
});
