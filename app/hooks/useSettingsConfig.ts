import {
  EmailIcon,
  ProfileIcon,
  PadlockIcon,
  CodeIcon,
  UserIcon,
  GroupIcon,
  GlobeIcon,
  ShieldIcon,
  TeamIcon,
  SparklesIcon,
  SettingsIcon,
  ExportIcon,
  ImportIcon,
  ShapesIcon,
  PlusIcon,
  InternetIcon,
  SmileyIcon,
  BrowserIcon,
  PaletteIcon,
} from "outline-icons";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import { createLazyComponent as lazy } from "~/components/LazyLoad";
import { Hook, PluginManager } from "~/utils/PluginManager";
import { settingsPath } from "~/utils/routeHelpers";
import { useComputed } from "./useComputed";
import useCurrentTeam from "./useCurrentTeam";
import useCurrentUser from "./useCurrentUser";
import usePolicy from "./usePolicy";
import useStores from "./useStores";

const ApiKeys = lazy(() => import("~/scenes/Settings/ApiKeys"));
const Appearance = lazy(() => import("~/scenes/Settings/Appearance"));
const Applications = lazy(() => import("~/scenes/Settings/Applications"));
const APIAndAccess = lazy(() => import("~/scenes/Settings/APIAndAccess"));
const Authentication = lazy(() => import("~/scenes/Settings/Authentication"));
const Details = lazy(() => import("~/scenes/Settings/Details"));
const Export = lazy(() => import("~/scenes/Settings/Export"));
const Features = lazy(() => import("~/scenes/Settings/Features"));
const Members = lazy(() => import("~/scenes/Settings/Members"));
const Import = lazy(() => import("~/scenes/Settings/Import"));
const Integrations = lazy(() => import("~/scenes/Settings/Integrations"));
const Notifications = lazy(() => import("~/scenes/Settings/Notifications"));
const Preferences = lazy(() => import("~/scenes/Settings/Preferences"));
const Profile = lazy(() => import("~/scenes/Settings/Profile"));
const Security = lazy(() => import("~/scenes/Settings/Security"));
const Shares = lazy(() => import("~/scenes/Settings/Shares"));
const Templates = lazy(() => import("~/scenes/Settings/Templates"));
const CustomEmojis = lazy(() => import("~/scenes/Settings/CustomEmojis"));
const Embeds = lazy(() => import("~/scenes/Settings/Embeds"));

export type ConfigItem = {
  name: string;
  path: string;
  icon: React.FC<{
    size?: number;
    fill?: string;
    monochrome?: boolean;
  }>;
  component: React.ComponentType;
  description?: string;
  preload?: () => void;
  enabled: boolean;
  group: string;
  pluginId?: string;
  nav?: boolean;
};

const useSettingsConfig = () => {
  const { integrations } = useStores();
  const user = useCurrentUser();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const { t } = useTranslation();

  useEffect(() => {
    void integrations.fetchAll();
  }, [integrations]);

  const config = useComputed(() => {
    const items: ConfigItem[] = [
      // Account
      {
        name: t("Profile"),
        path: settingsPath(),
        component: Profile.Component,
        preload: Profile.preload,
        description: t("Your name, photo and language."),
        enabled: true,
        group: t("Account"),
        icon: ProfileIcon,
      },
      {
        name: t("Preferences"),
        path: settingsPath("preferences"),
        component: Preferences.Component,
        preload: Preferences.preload,
        description: t("How the editor and the interface behave for you."),
        enabled: true,
        group: t("Account"),
        icon: SettingsIcon,
      },
      {
        name: t("Notifications"),
        path: settingsPath("notifications"),
        component: Notifications.Component,
        preload: Notifications.preload,
        description: t("Which emails you receive, and when."),
        enabled: true,
        group: t("Account"),
        icon: EmailIcon,
      },
      {
        name: t("Access & keys"),
        path: settingsPath("api-and-access"),
        component: APIAndAccess.Component,
        preload: APIAndAccess.preload,
        description: t(
          "Personal API keys, passkeys, and the apps connected to your account."
        ),
        enabled: true,
        group: t("Account"),
        icon: PadlockIcon,
      },
      {
        name: t("API Keys"),
        path: settingsPath("api-keys"),
        component: ApiKeys.Component,
        preload: ApiKeys.preload,
        enabled: can.listApiKeys,
        group: t("Account"),
        icon: CodeIcon,
        nav: false,
      },
      // Workspace
      {
        name: t("General"),
        path: settingsPath("details"),
        component: Details.Component,
        preload: Details.preload,
        description: t("Name, logo and defaults for the workspace."),
        enabled: can.update,
        group: t("Workspace"),
        icon: TeamIcon,
      },
      {
        name: t("Appearance"),
        path: settingsPath("appearance"),
        component: Appearance.Component,
        preload: Appearance.preload,
        description: t("Theme, accent colour, fonts, text size and code."),
        enabled: can.update,
        group: t("Workspace"),
        icon: PaletteIcon,
      },
      {
        name: t("Security"),
        path: settingsPath("security"),
        component: Security.Component,
        preload: Security.preload,
        description: t(
          "Sign-in methods, authentication, invites, sharing and AI."
        ),
        enabled: can.update,
        group: t("Workspace"),
        icon: ShieldIcon,
      },
      {
        name: t("Authentication"),
        path: settingsPath("authentication"),
        component: Authentication.Component,
        preload: Authentication.preload,
        enabled: can.update,
        group: t("Workspace"),
        icon: PadlockIcon,
        nav: false,
      },
      {
        name: t("AI"),
        path: settingsPath("features"),
        component: Features.Component,
        preload: Features.preload,
        enabled: can.update,
        group: t("Workspace"),
        icon: SparklesIcon,
        nav: false,
      },
      {
        name: t("Members"),
        path: settingsPath("users"),
        component: Members.Component,
        preload: Members.preload,
        description: t("People and groups in the workspace, and their roles."),
        enabled: can.listUsers,
        group: t("Workspace"),
        icon: UserIcon,
      },
      {
        name: t("Groups"),
        path: settingsPath("groups"),
        component: Members.Component,
        preload: Members.preload,
        enabled: can.listGroups,
        group: t("Workspace"),
        icon: GroupIcon,
        nav: false,
      },
      {
        name: t("Templates"),
        path: settingsPath("templates"),
        component: Templates.Component,
        preload: Templates.preload,
        description: t("Starting points for new documents."),
        enabled: can.readTemplate,
        group: t("Workspace"),
        icon: ShapesIcon,
      },
      {
        name: t("Emojis"),
        path: settingsPath("emojis"),
        component: CustomEmojis.Component,
        preload: CustomEmojis.preload,
        description: t("Custom emoji for this workspace."),
        enabled: can.update,
        group: t("Workspace"),
        icon: SmileyIcon,
      },
      {
        name: t("Shared links"),
        path: settingsPath("shares"),
        component: Shares.Component,
        preload: Shares.preload,
        description: t("Documents published outside the workspace."),
        enabled: can.listShares,
        group: t("Workspace"),
        icon: GlobeIcon,
      },
      {
        name: t("Export"),
        path: settingsPath("export"),
        component: Export.Component,
        preload: Export.preload,
        enabled: can.createExport,
        group: t("Workspace"),
        icon: ExportIcon,
        nav: false,
      },
      // Connections
      {
        name: t("Integrations"),
        path: settingsPath("integrations"),
        component: Integrations.Component,
        preload: Integrations.preload,
        description: t(
          "Embeds, webhooks, applications and third-party services."
        ),
        enabled: can.update,
        group: t("Connections"),
        icon: PlusIcon,
      },
      {
        name: t("Import & export"),
        path: settingsPath("import"),
        component: Import.Component,
        preload: Import.preload,
        description: t(
          "Move documents in from another tool, or take a copy out."
        ),
        enabled: can.createImport,
        group: t("Connections"),
        icon: ImportIcon,
      },
      {
        name: t("Embeds"),
        path: integrationSettingsPath("embeds"),
        component: Embeds.Component,
        preload: Embeds.preload,
        description: t(
          "Configure which embed providers are available in the editor."
        ),
        enabled: can.update,
        group: t("Connections"),
        icon: BrowserIcon,
        nav: false,
      },
      {
        name: t("Applications"),
        path: settingsPath("applications"),
        component: Applications.Component,
        preload: Applications.preload,
        description: t("OAuth applications built against this workspace."),
        enabled: can.listOAuthClients,
        group: t("Connections"),
        icon: InternetIcon,
        nav: false,
      },
    ];

    // Plugins
    PluginManager.getHooks(Hook.Settings).forEach((plugin) => {
      const declared = plugin.value.group ?? "Connections";
      const group = declared === "Integrations" ? "Connections" : declared;
      const insertIndex = plugin.value.after
        ? items.findIndex((i) => i.name === t(plugin.value.after!)) + 1
        : items.findIndex((i) => i.group === t(group));
      items.splice(insertIndex, 0, {
        name: t(plugin.name),
        path:
          group === "Connections"
            ? integrationSettingsPath(plugin.id)
            : settingsPath(plugin.id),
        group: t(group),
        nav: false,
        pluginId: plugin.id,
        description: plugin.value.description,
        component: plugin.value.component.Component,
        preload: plugin.value.component.preload,
        enabled: plugin.value.enabled
          ? plugin.value.enabled(team, user)
          : can.update,
        icon: plugin.value.icon,
      } as ConfigItem);
    });

    return items;
  }, [t, can.createApiKey, can.update, can.createImport, can.createExport]);

  return config.filter((item) => item.enabled);
};

export default useSettingsConfig;
