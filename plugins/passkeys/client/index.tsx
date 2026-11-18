import { t } from "i18next";
import { createLazyComponent } from "~/components/LazyLoad";
import { PluginManager, Hook } from "~/utils/PluginManager";
import { KeyIcon } from "outline-icons";
import config from "../plugin.json";

PluginManager.add([
  {
    ...config,
    type: Hook.Icon,
    value: KeyIcon,
  },
  {
    ...config,
    type: Hook.Settings,
    value: {
      group: "Account",
      after: "Notifications",
      icon: KeyIcon,
      description: () =>
        t(
          "Manage your passkeys for passwordless authentication using biometrics or security keys."
        ),
      component: createLazyComponent(() => import("./Settings")),
      enabled: () => true,
    },
  },
]);
