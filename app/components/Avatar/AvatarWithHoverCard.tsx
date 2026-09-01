import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { userPath } from "@shared/utils/routeHelpers";
import { UserHoverCard } from "~/components/UserHoverCard";
import User from "~/models/User";
import type { AvatarProps } from "./Avatar";
import Avatar from "./Avatar";

/**
 * An avatar that additionally displays a profile card on hover when the model
 * it represents is a user, and optionally links through to their profile.
 */
const AvatarWithHoverCard = React.forwardRef(function AvatarWithHoverCard_(
  { showTooltip, showHoverCard = true, linkToProfile, ...props }: AvatarProps,
  ref: React.Ref<HTMLDivElement>
) {
  const { model } = props;
  const { t } = useTranslation();

  if (!showHoverCard || !(model instanceof User)) {
    return <Avatar ref={ref} showTooltip={showTooltip} {...props} />;
  }

  const avatar = <Avatar ref={ref} {...props} />;

  return (
    <UserHoverCard user={model}>
      {linkToProfile ? (
        <ProfileAnchor
          to={userPath(model.id)}
          aria-label={t("View {{ name }}'s profile", { name: model.name })}
        >
          {avatar}
        </ProfileAnchor>
      ) : (
        avatar
      )}
    </UserHoverCard>
  );
});

const ProfileAnchor = styled(Link)`
  display: flex;
  color: inherit;
`;

export default observer(AvatarWithHoverCard);
