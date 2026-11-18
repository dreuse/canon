import { render, screen, waitFor } from "@testing-library/react";
import { runInAction } from "mobx";
import { vi } from "vitest";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { UserRole } from "@shared/types";
import { light } from "@shared/styles/theme";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import AppSidebar from "./App";

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const RECENT_TITLE = "Recently viewed document";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function seedStores() {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.mocked(client.post).mockResolvedValue({
    data: [],
    policies: [],
    pagination: {},
  });
  stores.users.add({ id: USER_ID, name: "Test User", role: UserRole.Admin });
  stores.auth.add({ id: TEAM_ID, name: "Test Team" });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
  });
  stores.documents.add({
    id: "doc-1",
    title: RECENT_TITLE,
    lastViewedAt: new Date().toISOString(),
  });
}

function renderSidebar() {
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter>
          <ActionContextProvider>
            <AppSidebar />
          </ActionContextProvider>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

describe("AppSidebar", () => {
  beforeEach(() => {
    seedStores();
  });

  it("R28 renders no Recent section", () => {
    renderSidebar();

    expect(screen.queryByText("Recent")).toBeNull();
    expect(screen.queryByText(RECENT_TITLE)).toBeNull();
  });

  it("loads starred documents on mount so the sidebar shows", async () => {
    runInAction(() => {
      stores.stars.isLoaded = false;
    });

    renderSidebar();

    await waitFor(() => expect(stores.ui.readyToShow).toBe(true));
    expect(
      vi.mocked(client.post).mock.calls.some(([path]) => path === "/stars.list")
    ).toBe(true);
  });

  it("R06 renders no search field", () => {
    renderSidebar();

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByPlaceholderText(/Search docs/)).toBeNull();
  });
});
