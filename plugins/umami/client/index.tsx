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
          "Gain privacy-first insights into how your team consumes docs. Inject your self-hosted Umami script across {{ appName }} pages to track views and engagement while retaining full control of your data.",
          { appName: env.APP_NAME }
        ),
      component: createLazyComponent(() => import("./Settings")),
      enabled: (_, user) => user.role === UserRole.Admin,
    },
  },
]);
