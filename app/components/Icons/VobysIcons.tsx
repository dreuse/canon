import type { SVGProps } from "react";

export type VobysIconProps = Omit<SVGProps<SVGSVGElement>, "color"> & {
  size?: number;
  color?: string;
};

const STROKE_AT_16 = 1.4;
const STROKE_AT_20 = 1.25;
const STROKE_AT_24 = 1.1;

const strokeWidthFor = (size: number) => {
  if (size <= 16) {
    return STROKE_AT_16;
  }
  if (size <= 20) {
    return STROKE_AT_20;
  }
  return STROKE_AT_24;
};

export const VobysIcon = ({
  size = 20,
  color = "currentColor",
  children,
  ...rest
}: VobysIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidthFor(size)}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    {...rest}
  >
    {children}
  </svg>
);

export const VoHomeIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M2.5 6.8L8 2.4l5.5 4.4V13a.8.8 0 01-.8.8H3.3a.8.8 0 01-.8-.8V6.8z" />
  </VobysIcon>
);

export const VoSearchIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <circle cx="7" cy="7" r="4.3" />
    <path d="M10.2 10.2L14 14" />
  </VobysIcon>
);

export const VoDraftsIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M10.8 2.6l2.6 2.6L5.6 12.8H3v-2.6L10.8 2.6z" />
  </VobysIcon>
);

export const VoSharedIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <circle cx="6" cy="5.6" r="2.2" />
    <path d="M2.4 13c0-2 1.6-3.3 3.6-3.3S9.6 11 9.6 13" />
    <circle cx="11.6" cy="6" r="1.7" />
    <path d="M11 9.9c1.6.1 2.6 1.3 2.6 3.1" />
  </VobysIcon>
);

export const VoStarredIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M8 2.2l1.8 3.7 4 .6-2.9 2.8.7 4L8 11.4 4.4 13.3l.7-4L2.2 6.5l4-.6L8 2.2z" />
  </VobysIcon>
);

export const VoCollectionIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M8 2.4l5.6 3-5.6 3-5.6-3 5.6-3z" />
    <path d="M2.4 8.6L8 11.6l5.6-3" />
  </VobysIcon>
);

export const VoArchiveIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <rect x="2.4" y="2.9" width="11.2" height="3.2" rx="1" />
    <path d="M3.4 6.1V13a.8.8 0 00.8.8h7.6a.8.8 0 00.8-.8V6.1M6.5 9.2h3" />
  </VobysIcon>
);

export const VoTrashIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M3 4.6h10M5.6 4.6V3.3a.8.8 0 01.8-.8h3.2a.8.8 0 01.8.8v1.3M4.5 4.6l.6 8.3a.8.8 0 00.8.7h4.2a.8.8 0 00.8-.7l.6-8.3" />
  </VobysIcon>
);

export const VoDocumentIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M4 2.3h5l3 3v8.4H4V2.3z" />
    <path d="M9 2.3v3h3" />
  </VobysIcon>
);

export const VoNewIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <circle cx="8" cy="8" r="5.6" />
    <path d="M8 5.4v5.2M5.4 8h5.2" />
  </VobysIcon>
);

export const VoCommentIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M3 3.4h10a.8.8 0 01.8.8v5.2a.8.8 0 01-.8.8H6.8L4 13v-2.8H3a.8.8 0 01-.8-.8V4.2a.8.8 0 01.8-.8z" />
  </VobysIcon>
);

export const VoBookmarkIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M4.2 2.6h7.6v11l-3.8-2.8-3.8 2.8v-11z" />
  </VobysIcon>
);

export const VoShareIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <circle cx="12" cy="3.6" r="1.7" />
    <circle cx="4" cy="8" r="1.7" />
    <circle cx="12" cy="12.4" r="1.7" />
    <path d="M5.5 7.2l5-2.6M5.5 8.8l5 2.6" />
  </VobysIcon>
);

export const VoEditIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M10.8 2.4l2.6 2.6-6.4 6.4H4.4V8.8L10.8 2.4M3 13.6h10" />
  </VobysIcon>
);

export const VoHistoryIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <circle cx="8" cy="8" r="5.6" />
    <path d="M8 4.8V8l2.3 1.4" />
  </VobysIcon>
);

export const VoMoreIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <circle cx="3.6" cy="8" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12.4" cy="8" r="1.2" fill="currentColor" stroke="none" />
  </VobysIcon>
);

export const VoCodeIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M6 4.2L2.6 8 6 11.8M10 4.2L13.4 8 10 11.8" />
  </VobysIcon>
);

export const VoQuoteIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M3 3.6v8.8M6 5.4h7M6 8h7M6 10.6h4.5" />
  </VobysIcon>
);

export const VoListIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <circle cx="3.4" cy="4.6" r=".9" fill="currentColor" stroke="none" />
    <circle cx="3.4" cy="8" r=".9" fill="currentColor" stroke="none" />
    <circle cx="3.4" cy="11.4" r=".9" fill="currentColor" stroke="none" />
    <path d="M6.4 4.6h7M6.4 8h7M6.4 11.4h7" />
  </VobysIcon>
);

export const VoChecklistIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M2.4 4.4l1.2 1.2 2.2-2.4M7.6 4.6h6M2.4 10.8l1.2 1.2 2.2-2.4M7.6 11h6" />
  </VobysIcon>
);

export const VoTableIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <rect x="2.4" y="3.4" width="11.2" height="9.2" rx="1" />
    <path d="M2.4 6.6h11.2M6.4 6.6v6" />
  </VobysIcon>
);

export const VoImageIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <rect x="2.4" y="3.4" width="11.2" height="9.2" rx="1" />
    <circle cx="5.8" cy="6.6" r="1" />
    <path d="M2.6 11.4l3.2-3 3 2.6 2-1.6 2.6 2.4" />
  </VobysIcon>
);

export const VoHeadingIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M3.4 3.6v8.8M9 3.6v8.8M3.4 8h5.6" />
  </VobysIcon>
);

export const VoLinkIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M6.8 9.2a2.6 2.6 0 010-3.6l1.8-1.8a2.6 2.6 0 013.6 3.6l-.9.9M9.2 6.8a2.6 2.6 0 010 3.6l-1.8 1.8a2.6 2.6 0 01-3.6-3.6l.9-.9" />
  </VobysIcon>
);

export const VoChevronRightIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M6.2 3.6L10.4 8l-4.2 4.4" />
  </VobysIcon>
);

export const VoChevronDownIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M3.6 6.2L8 10.4l4.4-4.2" />
  </VobysIcon>
);

export const VoPlusIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M8 3.2v9.6M3.2 8h9.6" />
  </VobysIcon>
);

export const VoCheckIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M3.2 8.4l3.2 3.2 6.4-7" />
  </VobysIcon>
);

export const VoCloseIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </VobysIcon>
);

export const VoWarningIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M8 2.6l5.8 10.4H2.2L8 2.6zM8 6.8v3" />
    <circle cx="8" cy="11.5" r=".7" fill="currentColor" stroke="none" />
  </VobysIcon>
);

export const VoInfoIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <circle cx="8" cy="8" r="5.6" />
    <path d="M8 7.4v3.6" />
    <circle cx="8" cy="5.2" r=".7" fill="currentColor" stroke="none" />
  </VobysIcon>
);

export const VoVerifiedIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <circle cx="8" cy="8" r="5.6" />
    <path d="M5.4 8.2l1.8 1.8 3.4-3.8" />
  </VobysIcon>
);
