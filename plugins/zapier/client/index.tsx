import { t } from "i18next";
import env from "~/env";
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
          "Connect your {{ appName }} workspace to Zapier to automate workflows and integrate with thousands of other tools.",
          { appName: env.APP_NAME }
        ),
      component: createLazyComponent(() => import("./Settings")),
    },
  },
]);
