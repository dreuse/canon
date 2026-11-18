import { observer } from "mobx-react";
import { SettingsIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { languageOptions as availableLanguages } from "@shared/i18n";
import { UrlHelper } from "@shared/utils/UrlHelper";
import {
  NotificationBadgeType,
  TeamPreference,
  UserPreference,
} from "@shared/types";
import type { UserPreferences } from "@shared/types";
import type { Theme } from "~/stores/UiStore";
import Button from "~/components/Button";
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import UserDelete from "../UserDelete";
import { AutoLaunchSetting } from "./components/AutoLaunchSetting";
import SettingRow from "./components/SettingRow";
import { SettingsSection } from "./components/SettingsSection";
import { SettingsTitle } from "./components/SettingsTitle";
import { ThemeCards } from "./components/ThemeCards";

const SAVED_TOAST_ID = "preference-saved";

function Preferences() {
  const { t } = useTranslation();
  const { ui, dialogs } = useStores();
  const user = useCurrentUser();
  const team = useCurrentTeam();
  const can = usePolicy(user.id);

  const languageOptions: Option[] = React.useMemo(
    () =>
      availableLanguages.map(
        (lang) =>
          ({
            type: "item",
            label: lang.label,
            value: lang.value,
          }) satisfies Option
      ),
    []
  );

  const announceSaved = React.useCallback(
    (name: string, undo: () => void) => {
      toast.success(t("Preference saved: {{ name }}", { name }), {
        id: SAVED_TOAST_ID,
        action: { label: t("Undo"), onClick: undo },
      });
    },
    [t]
  );

  const changePreference = React.useCallback(
    async <K extends UserPreference>(
      key: K,
      name: string,
      value: NonNullable<UserPreferences[K]>,
      fallback?: UserPreferences[K]
    ) => {
      const previous = user.getPreference(key, fallback);
      await user.savePreference(key, value);
      announceSaved(name, () => user.savePreference(key, previous));
    },
    [user, announceSaved]
  );

  const notificationBadgeOptions: Option[] = React.useMemo(
    () => [
      {
        type: "item",
        label: t("Disabled"),
        value: NotificationBadgeType.Disabled,
      },
      {
        type: "item",
        label: t("Unread count"),
        value: NotificationBadgeType.Count,
      },
      {
        type: "item",
        label: t("Unread indicator"),
        value: NotificationBadgeType.Indicator,
      },
    ],
    [t]
  );

  const handleLanguageChange = React.useCallback(
    async (language: string) => {
      const previous = user.language;
      await user.save({ language });
      announceSaved(t("Language"), () => user.save({ language: previous }));
    },
    [t, user, announceSaved]
  );

  const handleThemeChange = React.useCallback(
    (theme: Theme) => {
      const previous = ui.theme;
      ui.setTheme(theme);
      announceSaved(t("Theme"), () => ui.setTheme(previous));
    },
    [t, ui, announceSaved]
  );

  const showDeleteAccount = () => {
    dialogs.openModal({
      title: t("Delete account"),
      content: <UserDelete onSubmit={dialogs.closeAllModals} />,
    });
  };

  return (
    <Scene title={t("Preferences")} icon={<SettingsIcon />}>
      <SettingsTitle title={t("Preferences")}>
        <Trans>Manage settings that affect your personal experience.</Trans>
      </SettingsTitle>

      <SettingsSection
        title={t("Theme")}
        description={t(
          "The accent color comes from the workspace and shows in both themes."
        )}
      >
        <ThemeCards
          label={t("Theme")}
          checked={ui.theme}
          onSelect={handleThemeChange}
        />
      </SettingsSection>

      <SettingsSection title={t("Languages")}>
        <SettingRow
          label={t("Language")}
          name="language"
          description={
            <>
              {UrlHelper.translations ? (
                <Trans>
                  Choose the interface language. Community translations are
                  accepted through our{" "}
                  <a
                    href={UrlHelper.translations}
                    target="_blank"
                    rel="noreferrer"
                  >
                    translation portal
                  </a>
                  .
                </Trans>
              ) : (
                <Trans>Choose the interface language.</Trans>
              )}
            </>
          }
        >
          <InputSelect
            options={languageOptions}
            value={user.language}
            onChange={handleLanguageChange}
            label={t("Language")}
            labelHidden
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title={t("Behavior")}>
        <SettingRow
          name={UserPreference.SeamlessEdit}
          label={t("Separate editing")}
          description={t(
            `When enabled, documents have a separate editing mode. When disabled, documents are always editable when you have permission.`
          )}
        >
          <Switch
            id={UserPreference.SeamlessEdit}
            name={UserPreference.SeamlessEdit}
            checked={
              !user.getPreference(
                UserPreference.SeamlessEdit,
                team.getPreference(TeamPreference.SeamlessEdit)
              )
            }
            onChange={(checked: boolean) =>
              changePreference(
                UserPreference.SeamlessEdit,
                t("Separate editing"),
                !checked,
                team.getPreference(TeamPreference.SeamlessEdit)
              )
            }
          />
        </SettingRow>
        <SettingRow
          name={UserPreference.EnableSmartText}
          label={t("Smart text replacements")}
          description={t(
            "Auto-format text by replacing shortcuts with symbols, dashes, smart quotes, and other typographical elements."
          )}
        >
          <Switch
            id={UserPreference.EnableSmartText}
            name={UserPreference.EnableSmartText}
            checked={!!user.getPreference(UserPreference.EnableSmartText)}
            onChange={(checked: boolean) =>
              changePreference(
                UserPreference.EnableSmartText,
                t("Smart text replacements"),
                checked
              )
            }
          />
        </SettingRow>
        <SettingRow
          name={UserPreference.RememberLastPath}
          label={t("Remember previous location")}
          description={t(
            "Automatically return to the document you were last viewing when the app is reopened."
          )}
        >
          <Switch
            id={UserPreference.RememberLastPath}
            name={UserPreference.RememberLastPath}
            checked={!!user.getPreference(UserPreference.RememberLastPath)}
            onChange={(checked: boolean) =>
              changePreference(
                UserPreference.RememberLastPath,
                t("Remember previous location"),
                checked
              )
            }
          />
        </SettingRow>
        <SettingRow
          name={UserPreference.CommentsInGutter}
          label={t("Show comment marker")}
          description={t(
            "Display a marker beside lines in the editor that contain comments."
          )}
        >
          <Switch
            id={UserPreference.CommentsInGutter}
            name={UserPreference.CommentsInGutter}
            checked={user.getPreference(UserPreference.CommentsInGutter)}
            onChange={(checked: boolean) =>
              changePreference(
                UserPreference.CommentsInGutter,
                t("Show comment marker"),
                checked
              )
            }
          />
        </SettingRow>
        <SettingRow
          name={UserPreference.ShowDocumentStats}
          label={t("Show editing stats")}
          description={t(
            "Display live word, character, and paragraph counts while editing."
          )}
        >
          <Switch
            id={UserPreference.ShowDocumentStats}
            name={UserPreference.ShowDocumentStats}
            checked={user.getPreference(UserPreference.ShowDocumentStats)}
            onChange={(checked: boolean) =>
              changePreference(
                UserPreference.ShowDocumentStats,
                t("Show editing stats"),
                checked
              )
            }
          />
        </SettingRow>
        <SettingRow
          name={UserPreference.CodeBlockLineNumers}
          label={t("Show line numbers")}
          description={t("Show line numbers on code blocks in documents.")}
        >
          <Switch
            id={UserPreference.CodeBlockLineNumers}
            name={UserPreference.CodeBlockLineNumers}
            checked={user.getPreference(UserPreference.CodeBlockLineNumers)}
            onChange={(checked: boolean) =>
              changePreference(
                UserPreference.CodeBlockLineNumers,
                t("Show line numbers"),
                checked
              )
            }
          />
        </SettingRow>
        <SettingRow
          name={UserPreference.UseCursorPointer}
          label={t("Use pointer cursor")}
          description={t(
            "Show a hand cursor when hovering over interactive elements."
          )}
        >
          <Switch
            id={UserPreference.UseCursorPointer}
            name={UserPreference.UseCursorPointer}
            checked={user.getPreference(UserPreference.UseCursorPointer)}
            onChange={(checked: boolean) =>
              changePreference(
                UserPreference.UseCursorPointer,
                t("Use pointer cursor"),
                checked
              )
            }
          />
        </SettingRow>
        <AutoLaunchSetting />
        <SettingRow
          name={UserPreference.NotificationBadge}
          label={t("Notification badge")}
          description={t(
            "Choose how unread notifications are indicated on the app icon."
          )}
        >
          <InputSelect
            options={notificationBadgeOptions}
            value={user.getPreference(UserPreference.NotificationBadge)}
            onChange={(value: string) =>
              changePreference(
                UserPreference.NotificationBadge,
                t("Notification badge"),
                value as NotificationBadgeType
              )
            }
            label={t("Notification badge")}
            labelHidden
          />
        </SettingRow>
      </SettingsSection>

      {can.delete && (
        <SettingsSection title={t("Danger")} danger>
          <SettingRow
            name="delete"
            label={t("Delete account")}
            description={t(
              "You may delete your account at any time. Note that this cannot be undone."
            )}
          >
            <span>
              <Button onClick={showDeleteAccount} neutral danger>
                {t("Delete account…")}
              </Button>
            </span>
          </SettingRow>
        </SettingsSection>
      )}
    </Scene>
  );
}

export default observer(Preferences);
