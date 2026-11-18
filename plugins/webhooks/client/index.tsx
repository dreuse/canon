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
      group: "Developer",
      after: "Applications",
      icon: Icon,
      description: () =>
        t(
          "Automate downstream workflows with real-time JSON POSTs. Subscribe to events in {{ appName }} so external systems can react instantly.",
          { appName: env.APP_NAME }
        ),
      component: createLazyComponent(() => import("./Settings")),
    },
  },
]);
