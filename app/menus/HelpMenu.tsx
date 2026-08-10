import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  openDocumentation,
  openAPIDocumentation,
  openChangelog,
  openFeedbackUrl,
  openBugReportUrl,
} from "~/actions/definitions/navigation";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { useMenuAction } from "~/hooks/useMenuAction";

type Props = {
  children?: React.ReactNode;
};

const HelpMenu: React.FC = ({ children }: Props) => {
  const { t } = useTranslation();

  const actions = React.useMemo(
    () => [
      openDocumentation,
      openAPIDocumentation,
      openChangelog,
      openFeedbackUrl,
      openBugReportUrl,
    ],
    []
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} align="end" ariaLabel={t("Help")}>
      {children}
    </DropdownMenu>
  );
};

export default observer(HelpMenu);
