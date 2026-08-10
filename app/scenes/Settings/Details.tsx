import { observer } from "mobx-react";
import { CloseIcon, TeamIcon } from "outline-icons";
import { useRef, useState } from "react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import { TeamPreference } from "@shared/types";
import { getBaseDomain } from "@shared/utils/domains";
import { TeamValidation } from "@shared/validations";
import Button from "~/components/Button";
import DefaultCollectionInputSelect from "~/components/DefaultCollectionInputSelect";
import Input from "~/components/Input";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import isCloudHosted from "~/utils/isCloudHosted";
import { settingsPath } from "~/utils/routeHelpers";
import TeamDelete from "../TeamDelete";
import { ActionRow } from "./components/ActionRow";
import ImageInput from "./components/ImageInput";
import { SettingGroup } from "./components/SettingGroup";
import SettingRow from "./components/SettingRow";

import { SettingsTitle } from "./components/SettingsTitle";
const NO_ONBOARDING_COLLECTION = "none";

function Details() {
  const { dialogs } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const history = useHistory();

  const form = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || "");
  const [subdomain, setSubdomain] = useState(team.subdomain);
  const [publicBranding, setPublicBranding] = useState(
    team.preferences?.publicBranding
  );
  const [defaultCollectionId, setDefaultCollectionId] = useState<string | null>(
    team.defaultCollectionId
  );

  const [onboardingCollectionId, setOnboardingCollectionId] = useState(() => {
    const stored = team.getPreference(TeamPreference.OnboardingCollectionId);
    return typeof stored === "string" ? stored : null;
  });

  const handleSubmit = React.useCallback(
    async (event?: React.SyntheticEvent) => {
      if (event) {
        event.preventDefault();
      }

      try {
        await team.save({
          name,
          description,
          subdomain,
          defaultCollectionId,
          preferences: {
            ...team.preferences,
            publicBranding,
            onboardingCollectionId,
          },
        });
        toast.success(t("Settings saved"));
      } catch (err) {
        toast.error(errToString(err));
      }
    },
    [
      team,
      name,
      description,
      subdomain,
      defaultCollectionId,
      publicBranding,
      onboardingCollectionId,
      t,
    ]
  );

  const handleNameChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setName(ev.target.value);
    },
    []
  );

  const handleSubdomainChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setSubdomain(ev.target.value.toLowerCase());
    },
    []
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

  const onSelectCollection = React.useCallback((value: string) => {
    const selectedValue = value === "home" ? null : value;
    setDefaultCollectionId(selectedValue);
  }, []);

  const onSelectOnboardingCollection = React.useCallback((value: string) => {
    setOnboardingCollectionId(
      value === NO_ONBOARDING_COLLECTION ? null : value
    );
  }, []);

  const handleSeamlessEditChange = React.useCallback(
    async (checked: boolean) => {
      team.setPreference(TeamPreference.SeamlessEdit, !checked);
      await team.save();
      toast.success(t("Settings saved"));
    },
    [team, t]
  );

  const openAppearance = React.useCallback(() => {
    history.push(settingsPath("appearance"));
  }, [history]);

  const isValid = form.current?.checkValidity();

  return (
    <Scene title={t("General")} icon={<TeamIcon />}>
      <SettingsTitle title={t("General")}>
        <Trans>
          Name, logo and defaults for the workspace. Everyone on the team sees
          these.
        </Trans>
      </SettingsTitle>

      <form onSubmit={handleSubmit} ref={form}>
        <SettingGroup>{t("Identity")}</SettingGroup>
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
            onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
              setDescription(ev.target.value);
            }}
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
              t("Choose a subdomain to enable a login page just for your team.")
            )
          }
        >
          <Input
            id="subdomain"
            value={subdomain || ""}
            onChange={handleSubdomainChange}
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
            border={false}
            name={TeamPreference.PublicBranding}
            label={t("Public branding")}
            description={t(
              "Show your workspace logo, description, and branding on publicly shared pages."
            )}
          >
            <Switch
              id={TeamPreference.PublicBranding}
              name={TeamPreference.PublicBranding}
              checked={publicBranding}
              onChange={(checked: boolean) => setPublicBranding(checked)}
            />
          </SettingRow>
        )}

        <SettingGroup>{t("Defaults")}</SettingGroup>
        <SettingRow
          label={t("Start view")}
          name="defaultCollectionId"
          description={t("The first screen members see when they sign in.")}
        >
          <DefaultCollectionInputSelect
            onSelectCollection={onSelectCollection}
            defaultCollectionId={defaultCollectionId}
          />
        </SettingRow>
        <SettingRow
          label={t("Start here collection")}
          name={TeamPreference.OnboardingCollectionId}
          description={t("The path new members see on Home.")}
        >
          <DefaultCollectionInputSelect
            label={t("Start here collection")}
            onSelectCollection={onSelectOnboardingCollection}
            defaultCollectionId={onboardingCollectionId}
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
          border={false}
          name="appearance"
          label={t("Theme, fonts and text size")}
          description={t(
            "Moved to their own page — six controls that need a preview next to them."
          )}
        >
          <Button neutral onClick={openAppearance}>
            {t("Open Appearance")}
          </Button>
        </SettingRow>

        <ActionRow>
          <Button type="submit" disabled={team.isSaving || !isValid}>
            {team.isSaving ? `${t("Saving")}…` : t("Save")}
          </Button>
        </ActionRow>

        {can.delete && (
          <>
            <SettingGroup>{t("Danger")}</SettingGroup>
            <SettingRow
              name="delete"
              border={false}
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
          </>
        )}
      </form>
    </Scene>
  );
}

export default observer(Details);
