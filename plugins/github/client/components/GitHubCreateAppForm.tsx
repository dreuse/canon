import * as React from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import Input from "~/components/Input";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { generateOAuthStateNonce } from "~/utils/oauth";
import { GitHubOAuthNonceCookie, GitHubUtils } from "../../shared/GitHubUtils";

export function GitHubCreateAppForm() {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const [organization, setOrganization] = React.useState("");
  const manifest = React.useMemo(
    () => JSON.stringify(GitHubUtils.manifest(env.APP_NAME)),
    []
  );

  const handleOrganizationChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setOrganization(event.target.value),
    []
  );

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const nonce = generateOAuthStateNonce(GitHubOAuthNonceCookie);
      form.action = GitHubUtils.manifestUrl(
        { teamId: team.id, nonce },
        organization.trim() || undefined
      );
      form.submit();
    },
    [team.id, organization]
  );

  return (
    <form method="post" onSubmit={handleSubmit}>
      <input type="hidden" name="manifest" value={manifest} />
      <Input
        label={t("GitHub organization")}
        value={organization}
        onChange={handleOrganizationChange}
      />
      <Button type="submit">{t("Create GitHub App")}</Button>
    </form>
  );
}
