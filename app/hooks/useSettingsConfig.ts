import { BrowserIcon, CodeIcon, InfoIcon, InternetIcon } from "outline-icons";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  VoBuildingIcon,
  VoChainLinkIcon,
  VoDownloadIcon,
  VoGroupsIcon,
  VoKeyIcon,
  VoLayoutIcon,
  VoMembersIcon,
  VoNotificationsIcon,
  VoPaletteIcon,
  VoPlugIcon,
  VoProfileIcon,
  VoShieldIcon,
  VoSignInIcon,
  VoSlidersIcon,
  VoSmileIcon,
  VoSparkleIcon,
  VoUploadIcon,
} from "~/components/Icons/VobysIcons";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import { createLazyComponent as lazy } from "~/components/LazyLoad";
import { Hook, PluginManager } from "~/utils/PluginManager";
import { settingsPath } from "~/utils/routeHelpers";
import { useComputed } from "./useComputed";
import useCurrentTeam from "./useCurrentTeam";
import useCurrentUser from "./useCurrentUser";
import usePolicy from "./usePolicy";
import useStores from "./useStores";

const AI = lazy(() => import("~/scenes/Settings/AI"));
const ApiKeys = lazy(() => import("~/scenes/Settings/ApiKeys"));
const Appearance = lazy(() => import("~/scenes/Settings/Appearance"));
const Applications = lazy(() => import("~/scenes/Settings/Applications"));
const APIAndAccess = lazy(() => import("~/scenes/Settings/APIAndAccess"));
const Authentication = lazy(() => import("~/scenes/Settings/Authentication"));
const Details = lazy(() => import("~/scenes/Settings/Details"));
const Export = lazy(() => import("~/scenes/Settings/Export"));
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
const About = lazy(() => import("~/scenes/Settings/About"), {
  exportName: "About",
});

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
    void integrations.fetchAllIfNeeded();
  }, [integrations]);

  const config = useComputed(() => {
    const items: ConfigItem[] = [
      {
        name: t("Profile"),
        path: settingsPath(),
        component: Profile.Component,
        preload: Profile.preload,
        description: t("Your name, photo and language."),
        enabled: true,
        group: t("Account"),
        icon: VoProfileIcon,
      },
      {
        name: t("Preferences"),
        path: settingsPath("preferences"),
        component: Preferences.Component,
        preload: Preferences.preload,
        description: t("How the editor and the interface behave for you."),
        enabled: true,
        group: t("Account"),
        icon: VoSlidersIcon,
      },
      {
        name: t("Notifications"),
        path: settingsPath("notifications"),
        component: Notifications.Component,
        preload: Notifications.preload,
        description: t("Which emails you receive, and when."),
        enabled: true,
        group: t("Account"),
        icon: VoNotificationsIcon,
      },
      {
        name: t("API keys"),
        path: settingsPath("api-and-access"),
        component: APIAndAccess.Component,
        preload: APIAndAccess.preload,
        description: t(
          "Personal API keys, passkeys, and the apps connected to your account."
        ),
        enabled: true,
        group: t("Account"),
        icon: VoKeyIcon,
      },
      {
        name: t("API keys"),
        path: settingsPath("api-keys"),
        component: ApiKeys.Component,
        preload: ApiKeys.preload,
        enabled: can.listApiKeys,
        group: t("Account"),
        icon: CodeIcon,
        nav: false,
      },
      {
        name: t("General"),
        path: settingsPath("details"),
        component: Details.Component,
        preload: Details.preload,
        description: t("Name, logo and defaults for the workspace."),
        enabled: can.update,
        group: t("Workspace"),
        icon: VoBuildingIcon,
      },
      {
        name: t("Appearance"),
        path: settingsPath("appearance"),
        component: Appearance.Component,
        preload: Appearance.preload,
        description: t("Theme, accent color, fonts, text size and code."),
        enabled: can.update,
        group: t("Workspace"),
        icon: VoPaletteIcon,
      },
      {
        name: t("Members"),
        path: settingsPath("users"),
        component: Members.Component,
        preload: Members.preload,
        description: t("People and groups in the workspace, and their roles."),
        enabled: can.listUsers,
        group: t("Workspace"),
        icon: VoMembersIcon,
      },
      {
        name: t("Groups"),
        path: settingsPath("groups"),
        component: Members.Component,
        preload: Members.preload,
        enabled: can.listGroups,
        group: t("Workspace"),
        icon: VoGroupsIcon,
      },
      {
        name: t("Templates"),
        path: settingsPath("templates"),
        component: Templates.Component,
        preload: Templates.preload,
        description: t("Starting points for new documents."),
        enabled: can.readTemplate,
        group: t("Workspace"),
        icon: VoLayoutIcon,
      },
      {
        name: t("Shared links"),
        path: settingsPath("shares"),
        component: Shares.Component,
        preload: Shares.preload,
        description: t("Documents published outside the workspace."),
        enabled: can.listShares,
        group: t("Workspace"),
        icon: VoChainLinkIcon,
      },
      {
        name: t("Emojis"),
        path: settingsPath("emojis"),
        component: CustomEmojis.Component,
        preload: CustomEmojis.preload,
        description: t("Custom emoji for this workspace."),
        enabled: can.update,
        group: t("Workspace"),
        icon: VoSmileIcon,
      },
      {
        name: t("About"),
        path: settingsPath("about"),
        component: About.Component,
        preload: About.preload,
        description: t("Version, source code and license."),
        enabled: true,
        group: t("Workspace"),
        icon: InfoIcon,
        nav: false,
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
        group: t("Security and access"),
        icon: VoShieldIcon,
      },
      {
        name: t("Sign-in methods"),
        path: settingsPath("authentication"),
        component: Authentication.Component,
        preload: Authentication.preload,
        enabled: can.update,
        group: t("Security and access"),
        icon: VoSignInIcon,
      },
      {
        name: t("AI"),
        path: settingsPath("ai"),
        component: AI.Component,
        preload: AI.preload,
        enabled: can.update,
        group: t("Security and access"),
        icon: VoSparkleIcon,
      },
      {
        name: t("Import"),
        path: settingsPath("import"),
        component: Import.Component,
        preload: Import.preload,
        description: t(
          "Move documents in from another tool, or take a copy out."
        ),
        enabled: can.createImport,
        group: t("Data"),
        icon: VoUploadIcon,
      },
      {
        name: t("Export"),
        path: settingsPath("export"),
        component: Export.Component,
        preload: Export.preload,
        enabled: can.createExport,
        group: t("Data"),
        icon: VoDownloadIcon,
      },
      {
        name: t("Integrations"),
        path: settingsPath("integrations"),
        component: Integrations.Component,
        preload: Integrations.preload,
        description: t(
          "Embeds, webhooks, applications and third-party services."
        ),
        enabled: can.update,
        group: t("Data"),
        icon: VoPlugIcon,
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
        group: t("Data"),
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
        group: t("Data"),
        icon: InternetIcon,
        nav: false,
      },
    ];

    // Plugins
    PluginManager.getHooks(Hook.Settings).forEach((plugin) => {
      const declared = plugin.value.group ?? "Integrations";
      const isIntegration =
        declared === "Integrations" || declared === "Connections";
      const group = isIntegration ? "Data" : declared;
      const insertIndex = plugin.value.after
        ? items.findIndex((i) => i.name === t(plugin.value.after!)) + 1
        : items.findIndex((i) => i.group === t(group));
      items.splice(insertIndex, 0, {
        name: t(plugin.name),
        path: isIntegration
          ? integrationSettingsPath(plugin.id)
          : settingsPath(plugin.id),
        group: t(group),
        nav: false,
        pluginId: plugin.id,
        description: plugin.value.description?.(),
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
