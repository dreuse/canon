import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { NotificationEventType, UserPreference } from "@shared/types";
import { light } from "@shared/styles/theme";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { Theme } from "~/stores/UiStore";
import Notifications from "./Notifications";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const MASTER = "Email notifications";
const GROUP_TITLES = [
  "Documents",
  "Comments and mentions",
  "Access and invites",
  "Account and news",
];
const MIN_WHEN_ROWS = 14;
const CHECKED = "checked";
const UNCHECKED = "unchecked";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function Harness({ children }: { children: React.ReactNode }) {
  return (
    <Provider rootStore={stores}>
      <ThemeProvider theme={light}>
        <MemoryRouter>
          <ActionContextProvider>{children}</ActionContextProvider>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

function seed() {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  Element.prototype.scrollIntoView = vi.fn();
  stores.users.add({
    id: USER_ID,
    name: "Marina Lopes",
    language: "en_US",
    preferences: {},
    notificationSettings: {
      [NotificationEventType.PublishDocument]: true,
      [NotificationEventType.ResolveComment]: false,
    },
  });
  stores.auth.add({ id: TEAM_ID, name: "Omni" });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
    stores.ui.theme = Theme.Light;
  });
  const user = stores.users.get(USER_ID)!;
  const savePreference = vi
    .spyOn(user, "savePreference")
    .mockResolvedValue(undefined as never);
  return { user, savePreference };
}

function stateOf(element: HTMLElement) {
  return element.getAttribute("data-state");
}

function childSwitches() {
  return screen
    .getAllByRole("switch")
    .filter((element) => element.id !== UserPreference.EmailNotifications);
}

describe("Notifications", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("R21 renders the four groups in order", () => {
    seed();
    render(
      <Harness>
        <Notifications />
      </Harness>
    );

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);

    expect(headings).toEqual(GROUP_TITLES);
  });

  it("R21 starts every description with When and none with Receive", () => {
    seed();
    render(
      <Harness>
        <Notifications />
      </Harness>
    );

    expect(screen.getAllByText(/^When /).length).toBeGreaterThanOrEqual(
      MIN_WHEN_ROWS
    );
    expect(screen.queryAllByText(/^Receive /)).toHaveLength(0);
  });

  it("R21 keeps children enabled while the master is on", () => {
    seed();
    render(
      <Harness>
        <Notifications />
      </Harness>
    );

    expect(stateOf(screen.getByRole("switch", { name: MASTER }))).toBe(CHECKED);
    for (const element of childSwitches()) {
      expect(element.hasAttribute("disabled")).toBe(false);
    }
  });

  it("R21 disables every child without changing its value when the master is off", async () => {
    const { user } = seed();
    render(
      <Harness>
        <Notifications />
      </Harness>
    );
    const before = childSwitches().map((element) => stateOf(element));

    await act(async () => {
      runInAction(() => {
        user.preferences = { [UserPreference.EmailNotifications]: false };
      });
    });

    const switches = childSwitches();
    for (const element of switches) {
      expect(element.hasAttribute("disabled")).toBe(true);
    }
    expect(switches.map((element) => stateOf(element))).toEqual(before);
    expect(before).toContain(CHECKED);
    expect(before).toContain(UNCHECKED);
    expect(stateOf(screen.getByRole("switch", { name: MASTER }))).toBe(
      UNCHECKED
    );
  });

  it("R21 saves the master as a preference and leaves the children alone", async () => {
    const { user, savePreference } = seed();
    const settingsBefore = { ...user.notificationSettings };
    render(
      <Harness>
        <Notifications />
      </Harness>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: MASTER }));
    });

    expect(savePreference).toHaveBeenCalledWith(
      UserPreference.EmailNotifications,
      false
    );
    expect(user.notificationSettings).toEqual(settingsBefore);
  });
});
