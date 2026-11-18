import { cleanup, render, screen } from "@testing-library/react";
import i18n from "i18next";
import { readdirSync, readFileSync, statSync } from "fs";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import path from "path";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import enUS from "@shared/i18n/locales/en_US/translation.json";
import ptBR from "@shared/i18n/locales/pt_BR/translation.json";
import { light } from "@shared/styles/theme";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { Hook, PluginManager } from "~/utils/PluginManager";
import Preferences from "./Preferences";

const PT_BR = "pt-BR";
const EN_US = "en-US";
const USER_ID = "user-1";
const TEAM_ID = "team-1";
const ROOT = path.resolve(__dirname, "../../..");
const SETTINGS_SOURCES = [
  "app/scenes/Settings",
  "app/hooks/useSettingsConfig.ts",
];
const PLUGIN_CLIENT_PATTERN = /^plugins\/[^/]+\/client$/;
const OTHER_PRODUCT_NAMES = /Outline|Slab/;
const CATALOG = ptBR as Record<string, string>;
const EN_CATALOG = enUS as Record<string, string>;
const CLOSED_SOURCE_PLUGIN = "plugins/enterprise/client";
const PLURAL_SUFFIX = "_plural";
const MIN_NEEDLE_LENGTH = 17;

const IDENTICAL_IN_PT_BR = new Set([
  "Commit",
  "Editor",
  "Emoji",
  "Emojis",
  "Fira Code",
  "GitLab Cloud",
  "Google Analytics",
  "IBM Plex Mono",
  "IBM Plex Sans",
  "JetBrains Mono",
  "Lora",
  "Manual",
  "Markdown",
  "Source Serif",
  "URL",
  "Webhook",
]);

const T_CALL = /\bt\(\s*(["'`])((?:\\.|(?!\1).)*)\1/gs;
const TRANS_DEFAULTS = /<Trans[^>]*\sdefaults=(["'])((?:\\.|(?!\1).)*)\1/gs;
const TRANS_TEXT = /<Trans>([^<>{}]+)<\/Trans>/g;

function sourceFiles(relative: string): string[] {
  const absolute = path.join(ROOT, relative);
  if (statSync(absolute).isFile()) {
    return [absolute];
  }
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(child);
    }
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [path.join(ROOT, child)]
      : [];
  });
}

function pluginClientDirectories(): string[] {
  return readdirSync(path.join(ROOT, "plugins"))
    .map((name) => `plugins/${name}/client`)
    .filter(
      (dir) =>
        PLUGIN_CLIENT_PATTERN.test(dir) &&
        statSync(path.join(ROOT, dir), { throwIfNoEntry: false })?.isDirectory()
    );
}

function literalKeys(source: string): string[] {
  const collapse = (text: string) =>
    text
      .replace(/\\(["'`])/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  const keys: string[] = [];
  for (const match of source.matchAll(T_CALL)) {
    keys.push(match[2].replace(/\\(["'`])/g, "$1"));
  }
  for (const match of source.matchAll(TRANS_DEFAULTS)) {
    keys.push(match[2]);
  }
  for (const match of source.matchAll(TRANS_TEXT)) {
    keys.push(collapse(match[1]));
  }
  return keys.filter((key) => key && !key.includes("${"));
}

function settingsKeys(): string[] {
  const files = [...SETTINGS_SOURCES, ...pluginClientDirectories()].flatMap(
    sourceFiles
  );
  return [
    ...new Set(
      files.flatMap((file) => literalKeys(readFileSync(file, "utf8")))
    ),
  ].sort();
}

function collapseSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function catalogKeysUsedInSettings(): string[] {
  const files = [
    ...SETTINGS_SOURCES,
    ...pluginClientDirectories().filter((dir) => dir !== CLOSED_SOURCE_PLUGIN),
  ].flatMap(sourceFiles);
  const source = collapseSpaces(
    files.map((file) => readFileSync(file, "utf8")).join(" ")
  );
  return Object.keys(EN_CATALOG).filter((key) => {
    const base = key.endsWith(PLURAL_SUFFIX)
      ? key.slice(0, -PLURAL_SUFFIX.length)
      : key;
    const needle = base
      .split(/\{\{[^}]*\}\}|<[^>]*>/)
      .map(collapseSpaces)
      .reduce(
        (longest, part) => (part.length > longest.length ? part : longest),
        ""
      );
    return needle.length >= MIN_NEEDLE_LENGTH && source.includes(needle);
  });
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

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function seedStores() {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  stores.users.add({ id: USER_ID, name: "Marina Lopes", language: "pt_BR" });
  stores.auth.add({ id: TEAM_ID, name: "Omni" });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
  });
  stores.policies.add({
    id: USER_ID,
    abilities: { delete: true, update: true },
  });
  stores.policies.add({ id: TEAM_ID, abilities: { update: true } });
}

describe("settings copy", () => {
  beforeEach(async () => {
    i18n.addResourceBundle(PT_BR, "translation", CATALOG, true, true);
    await i18n.changeLanguage(PT_BR);
  });

  afterEach(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await i18n.changeLanguage(EN_US);
  });

  it("R18 renders Preferences without the English Theme, Display and comment marker labels", () => {
    seedStores();
    render(
      <Harness>
        <Preferences />
      </Harness>
    );

    expect(screen.queryAllByText("Theme")).toHaveLength(0);
    expect(screen.queryAllByText("Display")).toHaveLength(0);
    expect(screen.queryAllByText("Show comment marker")).toHaveLength(0);
    expect(screen.getAllByText("Tema").length).toBeGreaterThan(0);
    expect(screen.getByText("Mostrar marcador de comentário")).toBeTruthy();
    expect(screen.getAllByText("Selo de notificação").length).toBeGreaterThan(
      0
    );
    expect(screen.queryAllByText(/^Select /)).toHaveLength(0);
    expect(screen.getAllByText("Português (Brasil)").length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Portuguese/)).toHaveLength(0);
  });

  it("R18 gives every settings string a pt-BR value that differs from the English key", () => {
    const untranslated = settingsKeys().filter(
      (key) => !IDENTICAL_IN_PT_BR.has(key) && (CATALOG[key] ?? key) === key
    );

    expect(untranslated).toEqual([]);
  });

  it("R18 translates every catalog string, plural and rich text included, used by the settings", () => {
    const untranslated = catalogKeysUsedInSettings().filter(
      (key) =>
        !IDENTICAL_IN_PT_BR.has(key) &&
        (CATALOG[key] ?? key) === EN_CATALOG[key]
    );

    expect(untranslated).toEqual([]);
  });

  it("R18 names no other product in the settings strings", () => {
    const offenders = settingsKeys().filter(
      (key) =>
        OTHER_PRODUCT_NAMES.test(key) ||
        OTHER_PRODUCT_NAMES.test(CATALOG[key] ?? "")
    );

    expect(offenders).toEqual([]);
  });

  it("R18 keeps Slab off the Import page and the version out of its text", async () => {
    await PluginManager.loadPlugins();
    const titles = PluginManager.getHooks(Hook.Imports).map(
      (hook) => hook.value.title
    );
    const importSource = readFileSync(
      path.join(ROOT, "app/scenes/Settings/Import.tsx"),
      "utf8"
    );

    expect(titles).not.toContain("Slab");
    expect(importSource).not.toMatch(/\d+\.\d+\.\d+/);
  });

  it("R18 translates every integration description without another product name", async () => {
    await PluginManager.loadPlugins();
    const hooks = PluginManager.getHooks(Hook.Settings);
    await i18n.changeLanguage(EN_US);
    const english = hooks.map((hook) => hook.value.description?.());
    await i18n.changeLanguage(PT_BR);
    const portuguese = hooks.map((hook) => hook.value.description?.());

    expect(portuguese).toHaveLength(english.length);
    portuguese.forEach((description, index) => {
      if (!english[index]) {
        return;
      }
      expect(description).not.toEqual(english[index]);
      expect(description).not.toMatch(OTHER_PRODUCT_NAMES);
    });
  });
});
