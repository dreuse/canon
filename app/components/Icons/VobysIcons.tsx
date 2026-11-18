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
  size = 16,
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
    <rect x="2.5" y="2.9" width="11" height="3.2" rx="1" />
    <path d="M3.5 6.1V13a.8.8 0 00.8.8h7.4a.8.8 0 00.8-.8V6.1M6.5 9.2h3" />
  </VobysIcon>
);

export const VoBellIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <path d="M4 6.6a4 4 0 018 0v2.5l1 2H3l1-2V6.6zM6.6 13.1a1.5 1.5 0 002.8 0" />
  </VobysIcon>
);

export const VoHelpIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <circle cx="8" cy="8" r="5.6" />
    <path d="M6.4 6.4a1.6 1.6 0 113.1.5c-.2.7-1.5 1-1.5 2" />
    <path d="M8 11.4h.01" />
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

export const VoTemplateIcon = (props: VobysIconProps) => (
  <VobysIcon {...props}>
    <rect x="2.6" y="2.6" width="10.8" height="10.8" rx="1.6" />
    <path d="M2.6 6.4h10.8" />
    <path d="M6.6 6.4v7" />
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

const SETTINGS_VIEW_BOX = "0 0 24 24";
const SETTINGS_STROKE_WIDTH = 1.75;

const SettingsGlyph = (props: VobysIconProps) => (
  <VobysIcon
    viewBox={SETTINGS_VIEW_BOX}
    strokeWidth={SETTINGS_STROKE_WIDTH}
    {...props}
  />
);

export const VoProfileIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </SettingsGlyph>
);

export const VoSlidersIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
    <circle cx="15" cy="6" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="17" cy="18" r="2" />
  </SettingsGlyph>
);

export const VoNotificationsIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </SettingsGlyph>
);

export const VoKeyIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="m10.7 12.3 9.3-9.3M16 7l3 3M14 9l2 2" />
  </SettingsGlyph>
);

export const VoBuildingIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" />
  </SettingsGlyph>
);

export const VoPaletteIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-.9-.6-1.4-.6-2.2 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4c0-4.7-4-8.6-9-8.6z" />
    <circle cx="7.5" cy="11" r="1" />
    <circle cx="12" cy="7.5" r="1" />
    <circle cx="16.5" cy="11" r="1" />
  </SettingsGlyph>
);

export const VoMembersIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21a7 7 0 0 1 14 0M16 3.1a4 4 0 0 1 0 7.8M22 21a7 7 0 0 0-4-6.3" />
  </SettingsGlyph>
);

export const VoGroupsIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </SettingsGlyph>
);

export const VoLayoutIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9" />
  </SettingsGlyph>
);

export const VoChainLinkIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </SettingsGlyph>
);

export const VoShieldIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6z" />
  </SettingsGlyph>
);

export const VoSignInIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
  </SettingsGlyph>
);

export const VoSparkleIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
  </SettingsGlyph>
);

export const VoUploadIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <path d="M12 15V3M7 8l5-5 5 5" />
    <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
  </SettingsGlyph>
);

export const VoDownloadIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <path d="M12 3v12M7 10l5 5 5-5" />
    <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
  </SettingsGlyph>
);

export const VoPlugIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4" />
  </SettingsGlyph>
);

export const VoSmileIcon = (props: VobysIconProps) => (
  <SettingsGlyph {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
  </SettingsGlyph>
);
