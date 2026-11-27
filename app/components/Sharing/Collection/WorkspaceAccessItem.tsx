import { observer } from "mobx-react";
import { UserIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import Squircle from "@shared/components/Squircle";
import type { CollectionPermission } from "@shared/types";
import type Collection from "~/models/Collection";
import { AvatarSize } from "~/components/Avatar";
import { InputSelectPermission } from "~/components/InputSelectPermission";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import { EmptySelectValue } from "~/types";
import { ListItem } from "../components/ListItem";

interface Props {
  /** The collection whose workspace-wide permission is edited. */
  collection: Collection;
}

/**
 * List row that sets the permission every workspace member has on a collection.
 *
 * @param props the component props.
 * @returns the row element.
 */
export const WorkspaceAccessItem = observer(function WorkspaceAccessItem({
  collection,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const team = useCurrentTeam();
  const can = usePolicy(collection);

  const handleChange = (
    value: CollectionPermission | typeof EmptySelectValue
  ) => {
    void collection.save({
      permission: value === EmptySelectValue ? null : value,
    });
  };

  return (
    <ListItem
      image={
        <Squircle color={theme.accent} size={AvatarSize.Medium}>
          <UserIcon color={theme.accentText} size={16} />
        </Squircle>
      }
      title={team.name}
      subtitle={t("All members")}
      actions={
        <div style={{ marginRight: -8 }}>
          <InputSelectPermission
            onChange={handleChange}
            disabled={!can.manageUsers}
            value={collection.permission}
            labelHidden
            nude
            shrink
          />
        </div>
      }
    />
  );
});
