import { t } from "i18next";
import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import Icon from "./Icon";
import { createLazyComponent } from "~/components/LazyLoad";

PluginManager.add([
  {
    ...config,
    type: Hook.Settings,
    value: {
      group: "Integrations",
      icon: Icon,
      description: () =>
        t(
          "Connect your Figma account to enable rich design file previews inside documents."
        ),
      component: createLazyComponent(() => import("./Settings")),
    },
  },
]);
