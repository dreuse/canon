import { t } from "i18next";
import env from "~/env";
import { UserRole } from "@shared/types";
import { createLazyComponent } from "~/components/LazyLoad";
import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import Icon from "./Icon";

PluginManager.add([
  {
    ...config,
    type: Hook.Settings,
    value: {
      group: "Integrations",
      icon: Icon,
      description: () =>
        t(
          "Track your docs with a self-hosted, open-source analytics platform. Link {{ appName }} to Matomo for 100% data ownership, GDPR compliance, and deep usage insights on your own servers.",
          { appName: env.APP_NAME }
        ),
      component: createLazyComponent(() => import("./Settings")),
      enabled: (_, user) => user.role === UserRole.Admin,
    },
  },
]);
