import { render, screen } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { vi } from "vitest";
import { light } from "@shared/styles/theme";
import { UserRole } from "@shared/types";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import { AccessControlList } from "./AccessControlList";

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const DOCUMENT_ID = "document-1";
const COLLECTION_ID = "collection-1";
const WORKSPACE_ROW = "All members";
const TEAM_NAME = "Omni";
const PERMISSION_SELECT = "Permission";

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function seed(collectionAbilities: Record<string, boolean>) {
  stores.users.add({ id: USER_ID, name: "Ana", role: UserRole.Admin });
  stores.auth.add({ id: TEAM_ID, name: TEAM_NAME });
  stores.collections.add({ id: COLLECTION_ID, name: "Onboarding" });
  stores.documents.add({
    id: DOCUMENT_ID,
    title: "Board",
    collectionId: COLLECTION_ID,
    publishedAt: "2026-11-01T00:00:00.000Z",
  });
  stores.policies.add({
    id: COLLECTION_ID,
    abilities: { readDocument: true, ...collectionAbilities },
  });
  stores.policies.add({ id: DOCUMENT_ID, abilities: { read: true } });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
  });
}

function renderList() {
  const document = stores.documents.get(DOCUMENT_ID);
  if (!document) {
    throw new Error("document missing");
  }
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter>
          <ActionContextProvider>
            <AccessControlList
              document={document}
              invitedInSession={[]}
              share={null}
              sharedParent={null}
              onRequestClose={vi.fn()}
              visible
              loading={false}
            />
          </ActionContextProvider>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

describe("Document access list", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ObserverStub);
    vi.stubGlobal("IntersectionObserver", ObserverStub);
    vi.mocked(client.post).mockResolvedValue({
      data: [],
      policies: [],
      pagination: {},
    });
    stores.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lets a collection manager grant the workspace access to a private collection", () => {
    seed({ manageUsers: true });
    renderList();

    expect(screen.getByText(TEAM_NAME)).toBeTruthy();
    expect(screen.getByText(WORKSPACE_ROW)).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: PERMISSION_SELECT })
    ).toBeTruthy();
  });

  it("hides the workspace row from members who cannot manage the collection", () => {
    seed({});
    renderList();

    expect(screen.queryByText(WORKSPACE_ROW)).toBeNull();
  });
});
