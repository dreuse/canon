import { debounce } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { CloseIcon, TeamIcon } from "outline-icons";
import { useState } from "react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import type { TeamPreferences } from "@shared/types";
import { TeamPreference, UserPreference } from "@shared/types";
import { getBaseDomain } from "@shared/utils/domains";
import { TeamValidation } from "@shared/validations";
import { AvatarVariant } from "~/components/Avatar/Avatar";
import Button from "~/components/Button";
import DefaultCollectionInputSelect from "~/components/DefaultCollectionInputSelect";
import Input from "~/components/Input";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import type Team from "~/models/Team";
import isCloudHosted from "~/utils/isCloudHosted";
import { settingsPath } from "~/utils/routeHelpers";
import TeamDelete from "../TeamDelete";
import ImageInput from "./components/ImageInput";
import SettingRow from "./components/SettingRow";
import { SettingsSection } from "./components/SettingsSection";
import { SettingsTitle } from "./components/SettingsTitle";

const NO_ONBOARDING_COLLECTION = "none";

type TeamUpdate = Partial<
  Pick<Team, "name" | "description" | "subdomain" | "defaultCollectionId">
> & { preferences?: TeamPreferences };

function Details() {
  const { dialogs } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const can = usePolicy(team);
  const history = useHistory();

  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || "");
  const [subdomain, setSubdomain] = useState(team.subdomain);

  const onboardingCollectionId = team.getPreference(
    TeamPreference.OnboardingCollectionId
  );

  const showSuccessMessage = React.useMemo(
    () =>
      debounce(() => {
        toast.success(t("Settings saved"));
      }, 250),
    [t]
  );

  const saveData = React.useCallback(
    async (data: TeamUpdate) => {
      try {
        await team.save(data);
        showSuccessMessage();
        return true;
      } catch (err) {
        toast.error(errToString(err));
        return false;
      }
    },
    [team, showSuccessMessage]
  );

  const savePreference = React.useCallback(
    <T extends TeamPreference>(key: T, value: TeamPreferences[T]) =>
      saveData({ preferences: { [key]: value } }),
    [saveData]
  );

  const handleSubmit = React.useCallback((ev: React.FormEvent) => {
    ev.preventDefault();
  }, []);

  const handleKeyDown = React.useCallback((ev: React.KeyboardEvent) => {
    if (
      ev.key === "Enter" &&
      !ev.nativeEvent.isComposing &&
      ev.target instanceof HTMLInputElement &&
      ev.currentTarget.contains(ev.target)
    ) {
      ev.preventDefault();
      ev.target.blur();
    }
  }, []);

  const handleNameChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setName(ev.target.value);
    },
    []
  );

  const handleNameBlur = React.useCallback(async () => {
    if (name === team.name) {
      return;
    }
    if (!name.trim() || !(await saveData({ name }))) {
      setName(team.name);
    }
  }, [name, team, saveData]);

  const handleDescriptionChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setDescription(ev.target.value);
    },
    []
  );

  const handleDescriptionBlur = React.useCallback(async () => {
    if (description === (team.description || "")) {
      return;
    }
    if (!(await saveData({ description }))) {
      setDescription(team.description || "");
    }
  }, [description, team, saveData]);

  const handleSubdomainChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setSubdomain(ev.target.value.toLowerCase());
    },
    []
  );

  const handleSubdomainBlur = React.useCallback(async () => {
    if (subdomain === team.subdomain) {
      return;
    }
    if (!(await saveData({ subdomain }))) {
      setSubdomain(team.subdomain);
    }
  }, [subdomain, team, saveData]);

  const handlePublicBrandingChange = React.useCallback(
    (checked: boolean) =>
      savePreference(TeamPreference.PublicBranding, checked),
    [savePreference]
  );

  const handleSelectCollection = React.useCallback(
    (value: string) =>
      saveData({ defaultCollectionId: value === "home" ? null : value }),
    [saveData]
  );

  const handleSelectOnboardingCollection = React.useCallback(
    (value: string) =>
      savePreference(
        TeamPreference.OnboardingCollectionId,
        value === NO_ONBOARDING_COLLECTION ? null : value
      ),
    [savePreference]
  );

  const handleAvatarChange = async (avatarUrl: string | null) => {
    await team.save({ avatarUrl });
    toast.success(t("Logo updated"));
  };

  const handleAvatarError = React.useCallback(
    (error: string | null | undefined) => {
      toast.error(error || t("Unable to upload new logo"));
    },
    [t]
  );

  const showDeleteWorkspace = () => {
    dialogs.openModal({
      title: t("Delete workspace"),
      content: <TeamDelete onSubmit={dialogs.closeAllModals} />,
    });
  };

  const handleSeamlessEditChange = React.useCallback(
    async (checked: boolean) => {
      if (!(await savePreference(TeamPreference.SeamlessEdit, !checked))) {
        return;
      }

      if (checked) {
        try {
          await user.savePreference(UserPreference.SeamlessEdit, false);
        } catch (err) {
          toast.error(errToString(err));
        }
      }
    },
    [savePreference, user]
  );

  const openAppearance = React.useCallback(() => {
    history.push(settingsPath("appearance"));
  }, [history]);

  return (
    <Scene title={t("General")} icon={<TeamIcon />}>
      <SettingsTitle title={t("General")}>
        <Trans>
          Name, logo and defaults for the workspace. Everyone on the team sees
          these.
        </Trans>
      </SettingsTitle>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <SettingsSection title={t("Identity")}>
          <SettingRow
            label={t("Logo")}
            name="avatarUrl"
            description={t(
              "The logo is displayed at the top left of the application."
            )}
          >
            <ImageInput
              alt={t("Workspace logo")}
              onSuccess={handleAvatarChange}
              onError={handleAvatarError}
              model={team}
              borderRadius={0}
              variant={AvatarVariant.Square}
            />
          </SettingRow>
          <SettingRow
            label={t("Name")}
            name="name"
            description={t(
              "The workspace name, usually the same as your company name."
            )}
          >
            <Input
              id="name"
              autoComplete="organization"
              value={name}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              maxLength={TeamValidation.maxNameLength}
              showCharacterCount
              required
            />
          </SettingRow>
          <SettingRow
            label={t("Description")}
            name="description"
            description={t("A short description of your workspace.")}
          >
            <Input
              id="description"
              value={description}
              onChange={handleDescriptionChange}
              onBlur={handleDescriptionBlur}
              maxLength={TeamValidation.maxDescriptionLength}
              showCharacterCount
            />
          </SettingRow>
          <SettingRow
            visible={isCloudHosted}
            label={t("Subdomain")}
            name="subdomain"
            description={
              subdomain ? (
                <>
                  <Trans>Your workspace will be accessible at</Trans>{" "}
                  <strong>
                    {subdomain}.{getBaseDomain()}
                  </strong>
                </>
              ) : (
                t(
                  "Choose a subdomain to enable a login page just for your team."
                )
              )
            }
          >
            <Input
              id="subdomain"
              value={subdomain || ""}
              onChange={handleSubdomainChange}
              onBlur={handleSubdomainBlur}
              autoComplete="off"
              minLength={TeamValidation.minSubdomainLength}
              maxLength={
                isCloudHosted
                  ? TeamValidation.maxSubdomainLength
                  : TeamValidation.maxSubdomainSelfHostedLength
              }
            />
          </SettingRow>
          {(team.avatarUrl || team.description) && (
            <SettingRow
              name={TeamPreference.PublicBranding}
              label={t("Public branding")}
              description={t(
                "Show your workspace logo, description, and branding on publicly shared pages."
              )}
            >
              <Switch
                id={TeamPreference.PublicBranding}
                name={TeamPreference.PublicBranding}
                checked={!!team.getPreference(TeamPreference.PublicBranding)}
                onChange={handlePublicBrandingChange}
              />
            </SettingRow>
          )}
        </SettingsSection>

        <SettingsSection title={t("Defaults")}>
          <SettingRow
            label={t("Start view")}
            name="defaultCollectionId"
            description={t("The first screen members see when they sign in.")}
          >
            <DefaultCollectionInputSelect
              onSelectCollection={handleSelectCollection}
              defaultCollectionId={team.defaultCollectionId}
            />
          </SettingRow>
          <SettingRow
            label={t("Start here collection")}
            name={TeamPreference.OnboardingCollectionId}
            description={t("The path new members see on Home.")}
          >
            <DefaultCollectionInputSelect
              label={t("Start here collection")}
              onSelectCollection={handleSelectOnboardingCollection}
              defaultCollectionId={
                typeof onboardingCollectionId === "string"
                  ? onboardingCollectionId
                  : null
              }
              leadingOption={{
                label: t("None"),
                value: NO_ONBOARDING_COLLECTION,
                icon: <CloseIcon />,
              }}
            />
          </SettingRow>
          <SettingRow
            name={TeamPreference.SeamlessEdit}
            label={t("Separate editing")}
            description={t(
              "Documents open read-only and need an explicit Edit. Members can override this in their own preferences."
            )}
          >
            <Switch
              id={TeamPreference.SeamlessEdit}
              name={TeamPreference.SeamlessEdit}
              checked={!team.getPreference(TeamPreference.SeamlessEdit)}
              onChange={handleSeamlessEditChange}
            />
          </SettingRow>
          <SettingRow
            name="appearance"
            label={t("Theme, fonts and text size")}
            description={t(
              "Moved to their own page — six controls that need a preview next to them."
            )}
          >
            <Button type="button" neutral onClick={openAppearance}>
              {t("Open Appearance")}
            </Button>
          </SettingRow>
        </SettingsSection>
      </form>

      {can.delete && (
        <SettingsSection title={t("Danger")} danger>
          <SettingRow
            name="delete"
            label={t("Delete workspace")}
            description={t(
              "You can delete this entire workspace including collections, documents, and users."
            )}
          >
            <span>
              <Button onClick={showDeleteWorkspace} neutral>
                {t("Delete workspace")}…
              </Button>
            </span>
          </SettingRow>
        </SettingsSection>
      )}
    </Scene>
  );
}

export default observer(Details);
