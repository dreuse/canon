import { render, renderHook, screen } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { createElement } from "react";
import type { ComponentProps, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { ActionContextProvider } from "~/hooks/useActionContext";
import SettingsSidebar from "~/components/Sidebar/Settings";
import { SettingsFooter } from "~/components/Sidebar/components/SettingsFooter";
import env from "~/env";
import stores from "~/stores";
import { Hook, PluginManager } from "~/utils/PluginManager";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import { settingsPath } from "~/utils/routeHelpers";
import { version } from "../../package.json";
import useSettingsConfig from "./useSettingsConfig";

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const CHANGELOG_URL = "https://example.com/changelog";
const PLUGIN_ID = "dh2-plugin";
const APP_NAME = "Canon";
const PLUGIN_NAME = "DH2 Plugin";

const EXPECTED_GROUPS = ["Account", "Workspace", "Security and access", "Data"];

const EXPECTED_NAV: Record<string, string[]> = {
  Account: ["Profile", "Preferences", "Notifications", "API keys"],
  Workspace: [
    "General",
    "Appearance",
    "Members",
    "Groups",
    "Templates",
    "Shared links",
    "Emojis",
  ],
  "Security and access": ["Security", "Sign-in methods", "AI"],
  Data: ["Import", "Export", "Integrations"],
};

const ALL_ABILITIES = {
  update: true,
  listUsers: true,
  listGroups: true,
  listShares: true,
  readTemplate: true,
  createImport: true,
  createExport: true,
  listOAuthClients: true,
  listApiKeys: true,
};

function Wrapper({
  children,
  initialPath = "/",
}: {
  children?: ReactNode;
  initialPath?: string;
}) {
  const routed = createElement(
    ThemeProvider,
    { theme: light },
    createElement(
      MemoryRouter,
      { initialEntries: [initialPath] },
      createElement(ActionContextProvider, null, children)
    )
  );
  const props: ComponentProps<typeof Provider> = {
    rootStore: stores,
    children: routed,
  };
  return createElement(Provider, props);
}

function seedStores(abilities: Record<string, boolean>) {
  stores.users.add({ id: USER_ID, name: "Marina Lopes" });
  stores.auth.add({ id: TEAM_ID, name: "Omni" });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
  });
  stores.policies.add({ id: TEAM_ID, abilities });
}

function navGroups(items: ReturnType<typeof useSettingsConfig>) {
  const groups: Record<string, string[]> = {};
  items
    .filter((item) => item.nav !== false)
    .forEach((item) => {
      groups[item.group] = [...(groups[item.group] ?? []), item.name];
    });
  return groups;
}

function renderConfig() {
  return renderHook(() => useSettingsConfig(), { wrapper: Wrapper }).result
    .current;
}

describe("useSettingsConfig", () => {
  beforeEach(() => {
    env.APP_NAME = APP_NAME;
    vi.spyOn(stores.integrations, "fetchAllIfNeeded").mockResolvedValue([]);
    vi.spyOn(stores.notifications, "fetchPage").mockResolvedValue([]);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    UrlHelper.changelog = undefined;
  });

  it("R20 renders four groups in order with their items in order", () => {
    seedStores(ALL_ABILITIES);

    const groups = navGroups(renderConfig());

    expect(Object.keys(groups)).toEqual(EXPECTED_GROUPS);
    EXPECTED_GROUPS.forEach((group) => {
      expect(groups[group]).toEqual(EXPECTED_NAV[group]);
    });
  });

  it("R20 gives every nav item an icon", () => {
    seedStores(ALL_ABILITIES);

    renderConfig()
      .filter((item) => item.nav !== false)
      .forEach((item) => {
        expect(item.icon).toBeTruthy();
      });
  });

  it("R20 keeps items hidden when the permission is missing", () => {
    seedStores({ ...ALL_ABILITIES, update: false, createExport: false });

    const names = Object.values(navGroups(renderConfig())).flat();

    expect(names).not.toContain("Security");
    expect(names).not.toContain("AI");
    expect(names).not.toContain("Export");
    expect(names).toContain("Profile");
  });

  it("R20 places plugin integrations in the Data group", () => {
    seedStores(ALL_ABILITIES);
    vi.spyOn(PluginManager, "getHooks").mockReturnValue([
      {
        id: PLUGIN_ID,
        type: Hook.Settings,
        name: PLUGIN_NAME,
        priority: 0,
        value: {
          group: "Integrations",
          icon: () => null,
          component: { Component: () => null, preload: () => {} },
        },
      },
    ] as never);

    const item = renderConfig().find((i) => i.pluginId === PLUGIN_ID);

    expect(item?.group).toBe("Data");
    expect(item?.nav).toBe(false);
    expect(item?.path).toBe(integrationSettingsPath(PLUGIN_ID));
  });

  it("R20 marks Groups active on a group's members page", () => {
    seedStores(ALL_ABILITIES);

    render(createElement(SettingsSidebar), {
      wrapper: ({ children }) =>
        createElement(
          Wrapper,
          { initialPath: `${settingsPath("groups")}/group-1/members` },
          children
        ),
    });

    const groups = screen.getByRole("link", { name: "Groups" });

    expect(groups.getAttribute("aria-current")).toBe("page");
  });

  it("R20 shows the app name and version in the footer and no Installation group", () => {
    seedStores(ALL_ABILITIES);
    render(createElement(SettingsSidebar), { wrapper: Wrapper });

    const about = screen.getByRole("link", {
      name: `${APP_NAME} ${version}`,
    });

    expect(about.getAttribute("href")).toBe(settingsPath("about"));
    expect(screen.queryByText("Installation")).toBeNull();
    expect(screen.queryByRole("link", { name: "What’s new" })).toBeNull();
  });

  it("R20 shows What’s new in the footer only when the changelog URL is set", () => {
    UrlHelper.changelog = CHANGELOG_URL;

    render(createElement(SettingsFooter), { wrapper: Wrapper });

    const link = screen.getByRole("link", { name: "What’s new" });

    expect(link.getAttribute("href")).toBe(CHANGELOG_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });
});
