import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Button from "~/components/Button";
import Tooltip from "~/components/Tooltip";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useMobile from "~/hooks/useMobile";
import usePolicy from "~/hooks/usePolicy";
import { preloadEditor } from "~/routes/scenes";
import { newDocumentPath } from "~/utils/routeHelpers";

function NewDocumentMenu() {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const isPhone = useMobile();

  if (!can.createDocument) {
    return null;
  }

  return (
    <Tooltip content={t("New document")} shortcut="n" side="bottom">
      <Button
        as={Link}
        to={newDocumentPath()}
        icon={<PlusIcon />}
        aria-label={isPhone ? t("New document") : undefined}
        onPointerEnter={preloadEditor}
        onFocus={preloadEditor}
      >
        {isPhone ? null : t("New doc")}
      </Button>
    </Tooltip>
  );
}

export default observer(NewDocumentMenu);
