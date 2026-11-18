import { cleanup, render, screen } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import Export from "./Export";
import Import from "./Import";

vi.mock("~/components/PaginatedList", () => ({ default: () => null }));

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const NEUTRAL_VARIANT = "neutral";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderPage(page: React.ReactElement) {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  stores.users.add({ id: USER_ID, name: "Marina Lopes", email: "m@omni.io" });
  stores.auth.add({ id: TEAM_ID, name: "Omni" });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
  });
  return render(
    <Provider rootStore={stores}>
      <ThemeProvider theme={light}>
        <MemoryRouter>
          <ActionContextProvider>{page}</ActionContextProvider>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

describe("Export page", () => {
  afterEach(cleanup);

  it("R23 renders the export action as a secondary button", () => {
    renderPage(<Export />);
    const action = screen.getByRole("button", { name: /Export data/ });
    expect(action.getAttribute("data-variant")).toBe(NEUTRAL_VARIANT);
  });

  it("R23 links to export from the import page with a secondary button", () => {
    renderPage(<Import />);
    const action = screen.getByRole("link", { name: "Export the workspace" });
    expect(action.getAttribute("data-variant")).toBe(NEUTRAL_VARIANT);
  });

  it("R23 renders the plan badge as a non-interactive badge", () => {
    renderPage(<Import />);
    const badge = screen.getByText("Enterprise");
    expect(badge.closest("button")).toBeNull();
    expect(badge.getAttribute("role")).toBeNull();
    expect(badge.tagName).toBe("SPAN");
  });
});
