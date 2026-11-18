import { render, screen } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { vi } from "vitest";
import { light } from "@shared/styles/theme";
import { UserRole } from "@shared/types";
import Header from "~/components/Header";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";

const TABLET_WIDTH = 820;
const USER_ID = "user-1";
const TEAM_ID = "team-1";
const SEARCH_LABEL = "Search";
const NOTIFICATIONS_LABEL = "Notifications";
const MENU_LABEL = "Open menu";
const MAX_WIDTH_QUERY = /\(max-width:\s*(\d+)px\)/;

const kbarQuery = { toggle: vi.fn() };

vi.mock("kbar", () => ({
  useKBar: () => ({ query: kbarQuery }),
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function stubViewport(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => {
    const maxWidth = MAX_WIDTH_QUERY.exec(query)?.[1];
    return {
      media: query,
      matches: maxWidth !== undefined && width <= Number(maxWidth),
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });
}

function renderHeader() {
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter>
          <ActionContextProvider>
            <Header title="Title" hasSidebar topBar />
          </ActionContextProvider>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

describe("Header navigation shortcuts below the desktop breakpoint", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.mocked(client.post).mockResolvedValue({
      data: [],
      policies: [],
      pagination: {},
    });
    stores.clear();
    stubViewport(TABLET_WIDTH);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("R02 hides search and notifications from anonymous visitors", () => {
    renderHeader();

    expect(screen.getByRole("button", { name: MENU_LABEL })).toBeTruthy();
    expect(screen.queryByRole("button", { name: SEARCH_LABEL })).toBeNull();
    expect(
      screen.queryByRole("button", { name: NOTIFICATIONS_LABEL })
    ).toBeNull();
  });

  it("R02 shows search and notifications to a signed-in user", () => {
    stores.users.add({ id: USER_ID, name: "Test User", role: UserRole.Admin });
    stores.auth.add({ id: TEAM_ID, name: "Test Team" });
    runInAction(() => {
      stores.auth.currentUserId = USER_ID;
      stores.auth.currentTeamId = TEAM_ID;
    });
    renderHeader();

    expect(screen.getByRole("button", { name: SEARCH_LABEL })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: NOTIFICATIONS_LABEL })
    ).toBeTruthy();
  });
});
