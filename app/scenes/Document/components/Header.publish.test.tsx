import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { vi } from "vitest";
import { light } from "@shared/styles/theme";
import { UserRole } from "@shared/types";
import { DocumentContextProvider } from "~/components/DocumentContext";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import DocumentHeader from "./Header";

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const DOCUMENT_ID = "document-1";
const PERSONAL_COLLECTION_ID = "collection-personal";
const SHARED_COLLECTION_ID = "collection-shared";
const PUBLISH_LABEL = "Publish…";
const PUBLISH_NAME = "Publish";
const PUBLISHED_AT = "2026-11-01T00:00:00.000Z";

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function stubDesktop() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    media: query,
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function seedDocumentIn(collectionId: string) {
  stores.documents.add({
    id: DOCUMENT_ID,
    title: "Board",
    collectionId,
    publishedAt: PUBLISHED_AT,
  });
  stores.policies.add({
    id: DOCUMENT_ID,
    abilities: { read: true, update: true, move: true },
  });
  stores.ui.setActiveDocument(DOCUMENT_ID);
}

function renderHeader() {
  const document = stores.documents.get(DOCUMENT_ID);
  if (!document) {
    throw new Error("document missing");
  }
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter>
          <ActionContextProvider>
            <DocumentContextProvider>
              <DocumentHeader
                document={document}
                revision={undefined}
                isDraft={false}
                isEditing={false}
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

describe("Document header publish button", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ObserverStub);
    vi.stubGlobal("IntersectionObserver", ObserverStub);
    stubDesktop();
    vi.mocked(client.post).mockResolvedValue({
      data: [],
      policies: [],
      pagination: {},
    });
    stores.clear();
    stores.users.add({ id: USER_ID, name: "Test User", role: UserRole.Admin });
    stores.auth.add({ id: TEAM_ID, name: "Test Team" });
    stores.collections.add({
      id: PERSONAL_COLLECTION_ID,
      name: "Personal",
      ownerId: USER_ID,
    });
    stores.collections.add({ id: SHARED_COLLECTION_ID, name: "Onboarding" });
    runInAction(() => {
      stores.auth.currentUserId = USER_ID;
      stores.auth.currentTeamId = TEAM_ID;
      stores.collections.isLoaded = true;
    });
  });

  afterEach(() => {
    stores.dialogs.closeAllModals();
    vi.unstubAllGlobals();
  });

  it("shows Publish… on a published document in the personal collection", async () => {
    seedDocumentIn(PERSONAL_COLLECTION_ID);
    renderHeader();

    fireEvent.click(screen.getByText(PUBLISH_LABEL));

    await waitFor(() => expect(stores.dialogs.modalStack.size).toBe(1));
  });

  it("hides Publish… on a published document in a shared collection", () => {
    seedDocumentIn(SHARED_COLLECTION_ID);
    renderHeader();

    expect(screen.queryByText(PUBLISH_LABEL)).toBeNull();
    expect(screen.queryByText(PUBLISH_NAME)).toBeNull();
  });
});
