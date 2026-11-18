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
import { toast } from "sonner";
import type { Action } from "sonner";
import { ThemeProvider } from "styled-components";
import { TeamPreference, UserPreference } from "@shared/types";
import { light } from "@shared/styles/theme";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { Theme } from "~/stores/UiStore";
import Preferences from "./Preferences";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const TOAST_SUCCESS = vi.mocked(toast.success);
const COMMENT_MARKER = "Show comment marker";
const STATS = "Show editing stats";
const UNDO = "Undo";

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
  stores.users.add({ id: USER_ID, name: "Marina Lopes", language: "en_US" });
  stores.auth.add({ id: TEAM_ID, name: "Omni" });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
    stores.ui.theme = Theme.Light;
  });
  stores.policies.add({ id: USER_ID, abilities: { delete: true } });
  stores.policies.add({ id: TEAM_ID, abilities: { update: true } });
  const user = stores.users.get(USER_ID)!;
  const savePreference = vi
    .spyOn(user, "savePreference")
    .mockResolvedValue(undefined as never);
  const save = vi.spyOn(user, "save").mockResolvedValue(undefined as never);
  return { user, savePreference, save };
}

function isAction(value: unknown): value is Action {
  return typeof value === "object" && value !== null && "onClick" in value;
}

function lastToastOptions() {
  const [, options] = TOAST_SUCCESS.mock.calls.at(-1)!;
  return options!;
}

async function toggle(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("switch", { name }));
  });
}

async function undoLast() {
  await act(async () => {
    const { action } = lastToastOptions();
    if (!isAction(action)) {
      throw new Error("toast has no action");
    }
    const settled: unknown = action.onClick({} as never);
    await settled;
  });
}

describe("Preferences", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TOAST_SUCCESS.mockClear();
  });

  it("R19 saves a toggle and shows a toast with an Undo action", async () => {
    const { user, savePreference } = seed();
    const previous = user.getPreference(UserPreference.CommentsInGutter);
    render(
      <Harness>
        <Preferences />
      </Harness>
    );

    await toggle(COMMENT_MARKER);

    expect(savePreference).toHaveBeenCalledWith(
      UserPreference.CommentsInGutter,
      !previous
    );
    expect(TOAST_SUCCESS.mock.calls.at(-1)![0]).toBe(
      `Preference saved: ${COMMENT_MARKER}`
    );
    expect(lastToastOptions().action).toMatchObject({ label: UNDO });
  });

  it("R19 restores the previous value when Undo is clicked", async () => {
    const { user, savePreference } = seed();
    const previous = user.getPreference(UserPreference.CommentsInGutter);
    render(
      <Harness>
        <Preferences />
      </Harness>
    );

    await toggle(COMMENT_MARKER);
    await undoLast();

    expect(savePreference).toHaveBeenLastCalledWith(
      UserPreference.CommentsInGutter,
      previous
    );
  });

  it("R19 reuses one toast id so Undo reverts the last of two quick changes", async () => {
    const { user, savePreference } = seed();
    const previousStats = user.getPreference(UserPreference.ShowDocumentStats);
    render(
      <Harness>
        <Preferences />
      </Harness>
    );

    await toggle(COMMENT_MARKER);
    const firstId = lastToastOptions().id;
    await toggle(STATS);

    expect(lastToastOptions().id).toBe(firstId);
    expect(firstId).toBeDefined();
    await undoLast();
    expect(savePreference).toHaveBeenLastCalledWith(
      UserPreference.ShowDocumentStats,
      previousStats
    );
  });

  it("R19 restores the stored value of an inverted preference on Undo", async () => {
    const { user, savePreference } = seed();
    const previous = user.getPreference(
      UserPreference.SeamlessEdit,
      stores.auth.team?.getPreference(TeamPreference.SeamlessEdit)
    );
    render(
      <Harness>
        <Preferences />
      </Harness>
    );

    await toggle("Separate editing");
    await undoLast();

    expect(savePreference).toHaveBeenLastCalledWith(
      UserPreference.SeamlessEdit,
      previous
    );
  });

  it("R19 still undoes after the Preferences scene unmounts", async () => {
    const { user, savePreference } = seed();
    const previous = user.getPreference(UserPreference.CommentsInGutter);
    const view = render(
      <Harness>
        <Preferences />
      </Harness>
    );

    await toggle(COMMENT_MARKER);
    view.unmount();
    await undoLast();

    expect(savePreference).toHaveBeenLastCalledWith(
      UserPreference.CommentsInGutter,
      previous
    );
  });

  it("R19 sets the theme from a card and Undo restores the previous theme", async () => {
    seed();
    render(
      <Harness>
        <Preferences />
      </Harness>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("radio", { name: /Dark/ }));
    });

    expect(stores.ui.theme).toBe(Theme.Dark);
    expect(lastToastOptions().action).toMatchObject({ label: UNDO });
    await undoLast();
    expect(stores.ui.theme).toBe(Theme.Light);
  });

  it("R19 restores the previous language on Undo", async () => {
    const { save } = seed();
    render(
      <Harness>
        <Preferences />
      </Harness>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("combobox", { name: "Language" }));
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole("option", { name: /Português \(Brasil\)/ })
      );
    });
    expect(save).toHaveBeenLastCalledWith({ language: "pt_BR" });

    await undoLast();
    expect(save).toHaveBeenLastCalledWith({ language: "en_US" });
  });

  it("R19 renders the four groups and marks the current theme checked", () => {
    seed();
    render(
      <Harness>
        <Preferences />
      </Harness>
    );

    ["Theme", "Languages", "Behavior", "Danger"].forEach((name) => {
      expect(screen.getByRole("region", { name })).toBeTruthy();
    });
    const group = screen.getByRole("radiogroup");
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(3);
    expect(
      screen.getByRole("radio", { name: /Light/ }).getAttribute("aria-checked")
    ).toBe("true");
    expect(
      screen.getByRole("radio", { name: /Dark/ }).getAttribute("aria-checked")
    ).toBe("false");
  });
});
