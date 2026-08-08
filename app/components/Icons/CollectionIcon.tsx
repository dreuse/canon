import { observer } from "mobx-react";
import { CollectionIcon, PrivateCollectionIcon } from "outline-icons";
import { getLuminance } from "polished";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import LetterIcon from "@shared/components/LetterIcon";
import { colorPalette } from "@shared/constants";
import { CollectionIconStyle } from "@shared/types";
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
  const { ui } = useStores();
  const identityColor =
    inputColor ?? collection.color ?? colorPalette[0] ?? undefined;

  if (collection.iconStyle === CollectionIconStyle.None) {
    return null;
  }

  if (collection.iconStyle === CollectionIconStyle.Dot) {
    return (
      <Dot $color={identityColor} $size={size ?? 24} className={className} />
    );
  }

  if (collection.iconStyle === CollectionIconStyle.Letter) {
    return (
      <LetterIcon size={size} color={identityColor} className={className}>
        {collection.initial}
      </LetterIcon>
    );
  }

  if (!collection.icon || collection.icon === "collection") {
    // If the chosen icon color is very dark then we invert it in dark mode
    // otherwise it will be impossible to see against the dark background.
    const collectionColor = collection.color ?? colorPalette[0];
    const color =
      inputColor ||
      (ui.resolvedTheme === "dark" && collectionColor !== "currentColor"
        ? getLuminance(collectionColor) > 0.09
          ? collectionColor
          : "currentColor"
        : collectionColor);

    const Component = collection.isPrivate
      ? PrivateCollectionIcon
      : CollectionIcon;
    return (
      <Component
        color={color}
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

const Dot = styled.span<{ $color: string; $size: number }>`
  display: inline-flex;
  flex: 0 0 ${(props) => props.$size}px;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;

  &::before {
    content: "";
    margin: auto;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${(props) => props.$color};
  }
`;

export default observer(ResolvedCollectionIcon);
