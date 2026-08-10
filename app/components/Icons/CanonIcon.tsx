type Props = {
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the current text color */
  color?: string;
  /** Whether the safe area should be removed and have graphic across full size */
  cover?: boolean;
};

const markWidth = 140;
const markHeight = 100;
const clearSpace = 20;

export default function CanonIcon({
  size = 24,
  cover,
  color = "currentColor",
}: Props) {
  return (
    <svg
      fill={color}
      width={size}
      height={size}
      viewBox={
        cover
          ? `0 0 ${markWidth} ${markHeight}`
          : `${(markHeight + clearSpace * 2 - markWidth) / 2} ${-clearSpace} ${markHeight + clearSpace * 2} ${markHeight + clearSpace * 2}`
      }
      version="1.1"
    >
      <path d="M0 0 H60 V42 L0 100 Z" />
      <path d="M80 0 H140 V42 L80 100 Z" />
    </svg>
  );
}
