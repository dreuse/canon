import { t } from "i18next";
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
          "Search your knowledge base directly in Slack with {{ command }}, and get rich link previews and notifications for new or updated docs.",
          { command: "/outline" }
        ),
      component: createLazyComponent(() => import("./Settings")),
      enabled: () => true,
    },
  },
  {
    ...config,
    type: Hook.Icon,
    value: Icon,
  },
]);
