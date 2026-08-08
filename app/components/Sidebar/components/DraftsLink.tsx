import { observer } from "mobx-react";

import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import * as Scenes from "~/routes/scenes";
import { draftsPath } from "~/utils/routeHelpers";
import { useDropToUnpublish } from "../hooks/useDragAndDrop";
import SidebarLink from "./SidebarLink";
import { VoDraftsIcon } from "~/components/Icons/VobysIcons";

export const DraftsLink = observer(() => {
  const { t } = useTranslation();
  const { documents } = useStores();
  const [{ isOver, canDrop }, dropRef] = useDropToUnpublish();

  return (
    <div ref={dropRef}>
      <SidebarLink
        to={draftsPath()}
        onClickIntent={Scenes.Drafts.preload}
        icon={<VoDraftsIcon />}
        label={
          <Flex align="center" justify="space-between">
            {t("Drafts")}
            {documents.totalDrafts > 0 ? (
              <Drafts size="xsmall" type="tertiary">
                {documents.totalDrafts > 25 ? "25+" : documents.totalDrafts}
              </Drafts>
            ) : null}
          </Flex>
        }
        isActiveDrop={isOver && canDrop}
      />
    </div>
  );
});

const Drafts = styled(Text)`
  margin: 0 4px;
`;
