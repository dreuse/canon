import * as React from "react";
import { useTranslation } from "react-i18next";
import Button, { type Props as ButtonProps } from "~/components/Button";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { generateOAuthStateNonce } from "~/utils/oauth";
import { redirectTo } from "~/utils/urls";
import {
  type GitHubAppIdentity,
  GitHubOAuthNonceCookie,
  GitHubUtils,
} from "../../shared/GitHubUtils";

interface Props extends ButtonProps<"button"> {
  app: GitHubAppIdentity;
}

export function GitHubConnectButton({ app, ...props }: Props) {
  const { t } = useTranslation();
  const team = useCurrentTeam();

  const handleConnect = React.useCallback(() => {
    const nonce = generateOAuthStateNonce(GitHubOAuthNonceCookie);
    redirectTo(GitHubUtils.authUrl({ teamId: team.id, nonce }, app));
  }, [team.id, app]);

  return (
    <Button onClick={handleConnect} neutral {...props}>
      {t("Connect")}
    </Button>
  );
}
