import type { LocationDescriptor } from "history";
import * as React from "react";
import styled, { useTheme, css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import EventBoundary from "@shared/components/EventBoundary";
import { ellipsis, s } from "@shared/styles";
import { isMobile } from "@shared/utils/browser";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import { UnreadBadge } from "~/components/UnreadBadge";
import useClickIntent from "~/hooks/useClickIntent";
import { undraggableOnDesktop } from "~/styles";
import Disclosure from "./Disclosure";
import { DEPTH_STEP } from "./Folder";
import type { Props as NavLinkProps } from "./NavLink";
import NavLink from "./NavLink";
import type { ActionFactory, ActionWithChildren } from "~/types";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import { useTranslation } from "react-i18next";

/**
 * Props for the SidebarLink component.
 * Extends NavLink props with additional sidebar-specific functionality.
 */
type Props = Omit<NavLinkProps, "to"> & {
  /** The location to navigate to when the link is clicked */
  to?: LocationDescriptor;
  /** Ref callback to access the underlying HTML element */
  innerRef?: (ref: HTMLElement | null | undefined) => void;
  /** Callback fired when the link is clicked */
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  /** Callback when we expect the user to click on the link. Used for prefetching data. */
  onClickIntent?: React.MouseEventHandler<HTMLElement>;
  /** Callback fired when the disclosure icon is clicked */
  onDisclosureClick?: React.MouseEventHandler<HTMLElement>;
  /** Icon to display on the left side of the link */
  icon?: React.ReactNode;
  /** Text label or content to display for the link */
  label?: React.ReactNode;
  /** Optional menu to display on hover or interaction */
  menu?: React.ReactNode;
  /** Whether to show an unread badge indicator */
  unreadBadge?: boolean;
  /** Whether to show action buttons on hover */
  $showActions?: boolean;
  /** Whether the link is disabled and non-interactive */
  disabled?: boolean;
  /** Whether the link is currently active */
  active?: boolean;
  /** If set, a disclosure will be rendered to the left of any icon */
  expanded?: boolean;
  /** Whether this link is the current active drop target for drag and drop */
  isActiveDrop?: boolean;
  /** Whether this link represents a draft document */
  isDraft?: boolean;
  /** Nesting depth level for indentation (0-based) */
  depth?: number;
  /** Keep the disclosure inline and indented as if an icon were present */
  inlineDisclosure?: boolean;
  rank?: NavRank;
  count?: number;
  /** Whether to truncate the label text (default: true, causes overflow: hidden) */
  ellipsis?: boolean;
  /** Whether to automatically scroll this link into view if needed */
  scrollIntoViewIfNeeded?: boolean;
  /** Optional context menu action to display */
  contextAction?: ActionWithChildren | ActionFactory;
};

export type NavRank = "collection" | "section" | "document";

const rankWeight: Record<NavRank, number> = {
  collection: 600,
  section: 500,
  document: 400,
};

const DEFAULT_WEIGHT = 475;

const activeDropStyle = {
  fontWeight: 600,
};

// Prevents the parent NavLink's mousedown handler from firing (which would
// navigate or toggle), without calling preventDefault — that would block the
// native HTML5 drag from initiating on the draggable row.
const stopPropagation = (ev: React.MouseEvent) => {
  ev.stopPropagation();
};

function SidebarLink(
  {
    icon,
    onClick,
    onClickIntent,
    to,
    label,
    active,
    isActiveDrop,
    isDraft,
    menu,
    $showActions,
    exact,
    href,
    depth,
    inlineDisclosure,
    rank,
    count,
    className,
    expanded,
    onDisclosureClick,
    disabled,
    unreadBadge,
    contextAction,
    ellipsis = true,
    ...rest
  }: Props,
  ref: React.RefObject<HTMLAnchorElement>
) {
  const hasDisclosure = expanded !== undefined;
  const isIndented = !!icon || !!inlineDisclosure;
  const labelRef = React.useRef<HTMLDivElement>(null);
  const [truncatedLabel, setTruncatedLabel] = React.useState<string>();
  const { t } = useTranslation();
  const theme = useTheme();
  const { handleMouseEnter: handleClickIntent, handleMouseLeave } =
    useClickIntent(onClickIntent);
  const style = React.useMemo(
    () => ({
      paddingInlineStart: `${(depth || 0) * DEPTH_STEP + (isIndented ? 16 : 12)}px`,
      paddingInlineEnd: unreadBadge ? "32px" : undefined,
      fontWeight: rank ? rankWeight[rank] : DEFAULT_WEIGHT,
    }),
    [depth, isIndented, unreadBadge, rank]
  );

  const unreadStyle = React.useMemo(
    () => ({
      insetInlineEnd: -20,
    }),
    []
  );

  const activeStyle = React.useMemo(
    () => ({
      color: theme.text,
      ...style,
      fontWeight: (rank ? rankWeight[rank] : DEFAULT_WEIGHT) + 100,
    }),
    [theme.text, style, rank]
  );

  const measureLabel = React.useCallback(() => {
    const element = labelRef.current;
    if (!element || !ellipsis) {
      return;
    }
    // Some rows pass a label that truncates on a nested element, so the
    // wrapper alone does not report the overflow.
    const isTruncated = [
      element,
      ...element.querySelectorAll<HTMLElement>("*"),
    ].some((node) => node.scrollWidth > node.clientWidth);

    setTruncatedLabel(
      isTruncated ? (element.textContent ?? undefined) : undefined
    );
  }, [ellipsis]);

  React.useLayoutEffect(() => {
    measureLabel();
  }, [measureLabel]);

  const handleMouseEnter = React.useCallback(() => {
    measureLabel();
    handleClickIntent();
  }, [measureLabel, handleClickIntent]);

  const handleClick = React.useCallback(
    (ev: React.MouseEvent<HTMLAnchorElement>) => {
      if (onClick && !disabled && ev.isDefaultPrevented() === false) {
        onClick(ev);
      }
    },
    [onClick, disabled]
  );

  const handleDisclosureClick = React.useCallback(
    (ev: React.MouseEvent<HTMLElement>) => {
      if (!hasDisclosure) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      onDisclosureClick?.(ev);
    },
    [onDisclosureClick, hasDisclosure]
  );

  const DisclosureComponent = isIndented ? InlineDisclosure : Disclosure;

  const innerContent = (
    <>
      <ContextMenu action={contextAction} ariaLabel={t("Link options")}>
        <Content>
          {hasDisclosure && (
            <DisclosureComponent
              expanded={expanded}
              onClick={handleDisclosureClick}
              onMouseDown={stopPropagation}
              tabIndex={-1}
            />
          )}
          {icon && <IconWrapper aria-hidden>{icon}</IconWrapper>}
          <Tooltip content={truncatedLabel} placement="right" delay={500}>
            <Label ref={labelRef} $ellipsis={ellipsis}>
              {label}
            </Label>
          </Tooltip>
          {count !== undefined && count > 0 && <Count>{count}</Count>}
          {unreadBadge && <UnreadBadge style={unreadStyle} />}
        </Content>
      </ContextMenu>
      {menu && <Actions $showActions={$showActions}>{menu}</Actions>}
    </>
  );

  if (!to) {
    return (
      <Link
        as={href ? "a" : "button"}
        $isActiveDrop={isActiveDrop}
        $isDraft={isDraft}
        $disabled={disabled}
        style={active ? activeStyle : style}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDragEnter={handleMouseEnter}
        href={href}
        className={className}
        ref={ref}
        {...rest}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <Link
      $isActiveDrop={isActiveDrop}
      $isDraft={isDraft}
      $disabled={disabled}
      style={active ? activeStyle : style}
      activeStyle={isActiveDrop ? activeDropStyle : activeStyle}
      onClick={handleClick}
      onActiveClick={handleDisclosureClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDragEnter={handleMouseEnter}
      exact={exact !== false}
      to={to!}
      href={href}
      className={className}
      // @ts-expect-error spread props cause overload mismatch with styled NavLink
      ref={ref}
      {...rest}
    >
      {innerContent}
    </Link>
  );
}

// accounts for whitespace around icon
export const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-inline-end: 6px;
  width: 24px;
  height: 24px;
  overflow: hidden;
  flex-shrink: 0;
  transition: opacity 200ms ease-in-out;
`;

const Count = styled.span`
  flex-shrink: 0;
  align-self: center;
  margin-inline-start: 8px;
  font-size: 11.5px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  color: ${s("textTertiaryOnTint")};
  transition: opacity 100ms ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Content = styled.span`
  display: flex;
  align-items: start;
  position: relative;
  width: 100%;
  min-width: 0;
`;

const Actions = styled(EventBoundary)<{ $showActions?: boolean }>`
  display: inline-flex;
  visibility: ${(props) => (props.$showActions ? "visible" : "hidden")};

  [data-drag-active] & {
    display: none;
  }

  position: absolute;
  top: 3px;
  inset-inline-end: 4px;
  gap: 4px;
  color: ${s("textTertiary")};
  transition: opacity 50ms;
  height: 24px;
  background: var(--background);

  @media (max-width: 768px), (hover: none) {
    visibility: visible;
    top: 0;
    height: 100%;
    align-items: center;

    button,
    a,
    [role="button"] {
      min-width: 44px;
      min-height: 44px;
    }

    svg {
      opacity: 0.75;
    }
  }

  svg {
    width: 16px;
    height: 16px;
    color: ${s("textSecondary")};
    fill: currentColor;
    opacity: 0.5;
  }

  &:hover {
    visibility: visible;

    svg {
      opacity: 0.75;
    }
  }
`;

const InlineDisclosure = styled(Disclosure)`
  position: inherit;
  inset-inline-start: initial;
  display: block;
  margin-inline-start: -2px;
  margin-inline-end: 0;
`;

const Link = styled(NavLink)<{
  $isActiveDrop?: boolean;
  $isDraft?: boolean;
  $disabled?: boolean;
}>`
  --background: transparent;

  &:hover,
  &:active,
  &:has([data-state="open"]) {
    --background: ${s("sidebarHoverBackground")};
  }

  &[aria-current="page"] {
    --background: ${s("sidebarActiveBackground")};
  }

  &[aria-current="page"] ${Actions} {
    --background: ${s("sidebarActiveBackground")};
  }

  ${(props) => props.$isActiveDrop && `--background: ${props.theme.slateDark};`}

  display: flex;
  position: relative;
  text-overflow: ellipsis;
  font-weight: 475;
  padding: ${isMobile() ? 12 : 5}px 16px;
  border-radius: 0;
  min-height: 28px;
  user-select: none;
  white-space: nowrap;
  background: none;

  &::before {
    content: "";
    position: absolute;
    inset-block: 0;
    inset-inline: 8px;
    border-radius: 7px;
    background: var(--background);
    pointer-events: none;
    z-index: -1;
  }
  color: ${(props) =>
    props.$isActiveDrop ? props.theme.white : props.theme.sidebarText};
  font-size: 16px;
  cursor: var(--pointer);
  overflow: hidden;
  border: 0;
  width: 100%;
  ${undraggableOnDesktop()}

  ${(props) =>
    props.$disabled &&
    css`
      pointer-events: none;
      opacity: 0.75;
    `}

  ${(props) =>
    props.$isDraft &&
    css`
      &:after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        border-radius: 4px;
        border: 1.5px dashed ${props.theme.sidebarDraftBorder};
      }
    `}

  svg {
    ${(props) => (props.$isActiveDrop ? `fill: ${props.theme.white};` : "")}
    transition: fill 50ms;
  }

  ${breakpoint("tablet")`
    padding-block: 3px;
    padding-inline: 12px 16px;
    font-size: 14px;
  `}

  @media (hover: hover) {
    &:hover
      ${Actions},
      &:active
      ${Actions},
      &:has([data-state="open"])
      ${Actions} {
      visibility: visible;

      svg {
        opacity: 0.75;
      }
    }

    &:hover,
    &:has([data-state="open"]) {
      color: ${(props) =>
        props.$isActiveDrop ? props.theme.white : props.theme.text};
    }

    &:hover ${Count}, &:has([data-state="open"]) ${Count} {
      opacity: 0;
    }
  }

  & ${Actions} {
    ${NudeButton} {
      background: transparent;

      &:hover,
      &[aria-expanded="true"] {
        background: ${s("sidebarControlHoverBackground")};
      }
    }
  }
`;

const Label = styled.div<{ $ellipsis: boolean }>`
  position: relative;
  width: 100%;
  line-height: 24px;
  margin-inline-start: 2px;
  min-width: 0;
  text-align: start;

  ${(props) => props.$ellipsis && ellipsis()}

  * {
    unicode-bidi: plaintext;
  }
`;

export default React.forwardRef<HTMLAnchorElement, Props>(SidebarLink);
