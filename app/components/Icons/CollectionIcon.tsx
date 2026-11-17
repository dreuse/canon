import { observer } from "mobx-react";
import { CollectionIcon, PrivateCollectionIcon } from "outline-icons";
import DotIcon from "@shared/components/DotIcon";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import LetterIcon from "@shared/components/LetterIcon";
import { colorPalette } from "@shared/constants";
import { useSurface } from "@shared/components/SurfaceContext";
import { CollectionIconStyle } from "@shared/types";
import { resolveIconColor } from "@shared/utils/iconColor";
import Avatar from "~/components/Avatar/Avatar";
import type Collection from "~/models/Collection";
import useStores from "~/hooks/useStores";

type Props = {
  /** The collection to show an icon for */
  collection: Collection;
  /** Whether the icon should be the "expanded" graphic when displaying the default collection icon */
  expanded?: boolean;
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the collection color */
  color?: string;
  className?: string;
};

function ResolvedCollectionIcon({
  collection,
  color: inputColor,
  expanded,
  size,
  className,
}: Props) {
  const surface = useSurface();
  const identityColor =
    inputColor ??
    resolveIconColor(collection.color ?? colorPalette[0], surface);
  const { users } = useStores();
  const owner = collection.ownerId ? users.get(collection.ownerId) : undefined;

  if (owner) {
    const iconSize = size ?? 24;
    return (
      <AvatarWrapper $size={iconSize} className={className}>
        <Avatar model={owner} size={Math.round((iconSize * 2) / 3)} />
      </AvatarWrapper>
    );
  }

  if (collection.iconStyle === CollectionIconStyle.None) {
    return null;
  }

  if (collection.iconStyle === CollectionIconStyle.Dot) {
    return <DotIcon color={identityColor} size={size} className={className} />;
  }

  if (collection.iconStyle === CollectionIconStyle.Letter) {
    return (
      <LetterIcon size={size} color={identityColor} className={className}>
        {collection.initial}
      </LetterIcon>
    );
  }

  if (!collection.icon || collection.icon === "collection") {
    const Component = collection.isPrivate
      ? PrivateCollectionIcon
      : CollectionIcon;
    return (
      <Component
        color={identityColor}
        expanded={expanded}
        size={size}
        className={className}
      />
    );
  }

  return (
    <Icon
      value={collection.icon}
      color={inputColor ?? collection.color ?? undefined}
      size={size}
      initial={collection.initial}
      className={className}
      forceColor={inputColor ? true : false}
    />
  );
}

const AvatarWrapper = styled.span<{ $size: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
`;

export default observer(ResolvedCollectionIcon);
