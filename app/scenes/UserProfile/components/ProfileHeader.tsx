import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Avatar, { AvatarSize } from "~/components/Avatar/Avatar";
import Badge from "~/components/Badge";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import Time from "~/components/Time";
import type User from "~/models/User";
import type { UserContributionStats } from "~/types";

interface Props {
  /** The user whose profile is being shown. */
  user: User;
  /** Aggregate contribution counts for the last year, when loaded. */
  stats?: UserContributionStats;
  /** Whether the viewer is looking at their own profile. */
  isSelf: boolean;
}

/**
 * The identity block at the top of a user's profile: avatar, name, role and
 * status badges, membership dates, and a summary of the last year's activity.
 */
export const ProfileHeader = observer(function ProfileHeader_({
  user,
  stats,
  isSelf,
}: Props) {
  const { t } = useTranslation();

  return (
    <Flex column gap={16}>
      <Flex gap={16} align="center">
        <Avatar model={user} size={AvatarSize.XXLarge} showHoverCard={false} />
        <Flex column gap={4}>
          <Flex align="center" gap={6}>
            <Name>
              {user.name}
              {isSelf ? ` (${t("You")})` : ""}
            </Name>
            {user.isAdmin ? (
              <Badge primary>{t("Admin")}</Badge>
            ) : user.isGuest ? (
              <Badge>{t("Guest")}</Badge>
            ) : null}
            {user.isSuspended && <Badge>{t("Suspended")}</Badge>}
            {user.isInvited && <Badge>{t("Invited")}</Badge>}
          </Flex>
          <Text as="p" type="tertiary" size="small">
            {user.email ? <span>{user.email} &middot; </span> : null}
            {t("Joined")} <Time dateTime={user.createdAt} addSuffix />
            {!user.isInvited && user.localTime ? (
              <span>
                {" "}
                &middot; {t("{{ time }} local time", { time: user.localTime })}
              </span>
            ) : null}
          </Text>
        </Flex>
      </Flex>

      <Stats gap={24} wrap>
        <Stat
          label={t("Contributions")}
          value={stats?.total}
          hint={t("in the last year")}
        />
        <Stat label={t("Edits")} value={stats?.edits} />
        <Stat label={t("Published")} value={stats?.documentsPublished} />
        <Stat label={t("Collections")} value={stats?.collectionsCreated} />
      </Stats>
    </Flex>
  );
});

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value?: number;
  hint?: string;
}) {
  return (
    <Flex column>
      <StatValue>{value ?? "—"}</StatValue>
      <Text size="xsmall" type="tertiary">
        {hint ? `${label} ${hint}` : label}
      </Text>
    </Flex>
  );
}

const Name = styled.h1`
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
`;

const Stats = styled(Flex)`
  padding: 12px 0;
  border-top: 1px solid ${s("divider")};
  border-bottom: 1px solid ${s("divider")};
`;

const StatValue = styled.span`
  font-size: 20px;
  font-weight: 500;
  color: ${s("text")};
  font-variant-numeric: tabular-nums;
`;
