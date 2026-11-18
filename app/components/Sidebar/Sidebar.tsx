import * as Dialog from "@radix-ui/react-dialog";
import { observer } from "mobx-react";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import { useHistory } from "react-router-dom";
import styled, { ThemeProvider, keyframes, useTheme } from "styled-components";
import { breakpoint } from "@shared/styles/breakpoint";
import { depths, s } from "@shared/styles";
import { sidebarRailWidth } from "@shared/styles/theme";
import { Avatar } from "~/components/Avatar";
import Flex from "~/components/Flex";
import useCurrentUser from "~/hooks/useCurrentUser";
import useBelowDesktop from "~/hooks/useBelowDesktop";
import useStores from "~/hooks/useStores";
import { useSwipeToDismiss } from "~/hooks/useSwipeToDismiss";
import AccountMenu from "~/menus/AccountMenu";
import { fadeOnDesktopBackgrounded } from "~/styles";
import { drawerTransition, fadeIn, fadeOut } from "~/styles/animations";
import { TooltipProvider } from "../TooltipContext";
import SidebarButton from "./components/SidebarButton";
import { useTranslation } from "react-i18next";
import { useDirection } from "@radix-ui/react-direction";

type Props = {
  /** Whether to hide the sidebar content (sets opacity to 0). */
  hidden?: boolean;
  /** Whether the sidebar can be collapsed, defaults to true. */
  canCollapse?: boolean;
  /** Whether to show the account menu for the signed-in user, defaults to true. */
  showAccountMenu?: boolean;
  /** CSS class name(s) to apply to the sidebar container. */
  className?: string;
  /** Content to render inside the sidebar. */
  children: React.ReactNode;
  /** Buttons to render alongside the account row at the foot of the sidebar. */
  accountActions?: React.ReactNode;
  /** Whether to render as a drawer, defaults to the viewport being below the desktop breakpoint. */
  drawer?: boolean;
  /** Ref to the sidebar container. */
  ref?: React.Ref<HTMLDivElement>;
};

function Sidebar({
  children,
  accountActions,
  hidden = false,
  canCollapse = true,
  showAccountMenu = true,
  className,
  drawer,
  ref,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { ui } = useStores();
  const history = useHistory();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const belowDesktop = useBelowDesktop();
  const isDrawer = drawer ?? belowDesktop;
  const width = ui.sidebarWidth;
  const collapsed = ui.sidebarIsClosed && canCollapse && !isDrawer;
  const direction = useDirection();

  const internalRef = React.useRef<HTMLDivElement | null>(null);
  const backdropRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = React.useMemo(() => mergeRefs([internalRef, ref]), [ref]);

  // Subscribe to history rather than the location, so that the sidebar does
  // not re-render on every navigation.
  React.useEffect(
    () =>
      history.listen(() => {
        ui.hideMobileSidebar();
      }),
    [ui, history]
  );

  React.useEffect(() => {
    if (!isDrawer) {
      ui.hideMobileSidebar();
    }
  }, [ui, isDrawer]);

  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  const handleOpenAutoFocus = React.useCallback(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }, []);

  const handleCloseAutoFocus = React.useCallback((event: Event) => {
    event.preventDefault();
    const active = document.activeElement;
    if (
      !active ||
      active === document.body ||
      internalRef.current?.contains(active)
    ) {
      returnFocusRef.current?.focus();
    }
  }, []);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        ui.hideMobileSidebar();
      }
    },
    [ui]
  );

  // On mobile the width comes from the viewport, not the resizable desktop width.
  const style = React.useMemo(
    () =>
      isDrawer
        ? undefined
        : { width: `${collapsed ? sidebarRailWidth : width}px` },
    [isDrawer, collapsed, width]
  );

  // On mobile the sidebar is a drawer, so it uses the drawer colors.
  const sidebarTheme = React.useMemo(
    () =>
      isDrawer
        ? {
            ...theme,
            sidebarBackground: theme.menuBackground,
            sidebarHoverBackground: theme.menuItemSelected,
            sidebarActiveBackground: theme.menuItemSelected,
          }
        : theme,
    [isDrawer, theme]
  );

  useSwipeToDismiss(internalRef, backdropRef, {
    enabled: isDrawer && ui.mobileSidebarVisible,
    side: direction === "rtl" ? "right" : "left",
    onDismiss: ui.hideMobileSidebar,
  });

  const container = (
    <Container
      id="sidebar"
      ref={mergedRef}
      style={style}
      $hidden={hidden}
      $mobileSidebarVisible={ui.mobileSidebarVisible}
      className={className}
      column
    >
      {isDrawer && <Dialog.Title hidden>{t("Main navigation")}</Dialog.Title>}
      {children}

      {user && showAccountMenu && (
        <AccountMenu>
          <SidebarButton
            title={user.name}
            position="bottom"
            image={
              <Avatar
                alt={t("Avatar of {{ name }}", { name: user.name })}
                model={user}
                size={24}
                showHoverCard={false}
              />
            }
          >
            {accountActions}
          </SidebarButton>
        </AccountMenu>
      )}
    </Container>
  );

  return (
    <ThemeProvider theme={sidebarTheme}>
      <TooltipProvider>
        {isDrawer ? (
          <Dialog.Root
            open={ui.mobileSidebarVisible}
            onOpenChange={handleOpenChange}
          >
            <DrawerOverlay ref={backdropRef} />
            <Dialog.Content
              asChild
              aria-describedby={undefined}
              onOpenAutoFocus={handleOpenAutoFocus}
              onCloseAutoFocus={handleCloseAutoFocus}
            >
              {container}
            </Dialog.Content>
          </Dialog.Root>
        ) : (
          container
        )}
      </TooltipProvider>
    </ThemeProvider>
  );
}

const DrawerOverlay = styled(Dialog.Overlay)`
  position: fixed;
  inset: 0;
  z-index: ${depths.mobileSidebar - 1};
  background: ${s("backdrop")};

  &[data-state="open"] {
    animation: ${fadeIn} ${drawerTransition};
  }

  &[data-state="closed"] {
    animation: ${fadeOut} ${drawerTransition};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
  }
`;

const slideIn = keyframes`
  from {
    transform: translateX(var(--drawer-offset));
  }
  to {
    transform: translateX(0);
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(var(--drawer-offset));
  }
`;

type ContainerProps = {
  $mobileSidebarVisible: boolean;
  $hidden: boolean;
};

const Container = styled(Flex)<ContainerProps>`
  position: fixed;
  top: 0;
  bottom: 0;
  inset-inline-start: 0;
  width: 100%;
  background: ${s("sidebarBackground")};
  transition:
    box-shadow 150ms ease-in-out,
    transform ${drawerTransition};
  transform: translateX(
    ${(props) => (props.$mobileSidebarVisible ? 0 : "-100%")}
  );
  z-index: ${depths.mobileSidebar};
  max-width: 80%;
  min-width: 280px;
  padding-inline-start: var(--sal);
  padding-bottom: var(--sab, 0px);
  ${fadeOnDesktopBackgrounded()}

  ${breakpoint("mobile", "desktop")`
    /* Leaves a strip of the page visible to tap and close, as in Material navigation drawers. */
    width: calc(100% - 56px);
    max-width: 360px;
    min-width: 0;
    --drawer-offset: -100%;

    [dir="rtl"] & {
      --drawer-offset: 100%;
    }

    &[data-state="open"] {
      animation: ${slideIn} ${drawerTransition};
    }

    &[data-state="closed"] {
      animation: ${slideOut} ${drawerTransition};
    }

    @media (prefers-reduced-motion: reduce) {
      animation: none !important;
    }
    border-start-end-radius: 8px;
    border-end-end-radius: 8px;
    /* The negative spread keeps the shadow off the edge side, so a stretch cannot reveal it. */
    box-shadow: ${(props: ContainerProps) =>
      props.$mobileSidebarVisible
        ? "12px 0 24px -12px rgb(0 0 0 / 16%)"
        : "none"};

    [dir="rtl"] & {
      box-shadow: ${(props: ContainerProps) =>
        props.$mobileSidebarVisible
          ? "-12px 0 24px -12px rgb(0 0 0 / 16%)"
          : "none"};
    }

    @supports (corner-shape: superellipse(2)) {
      border-start-end-radius: 14px;
      border-end-end-radius: 14px;
      corner-shape: superellipse(2);
    }

    /* Fills the space behind the edge when the sidebar is stretched past open,
       overlapping by a pixel so no seam shows at fractional offsets. */
    &::after {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      inset-inline-end: calc(100% - 1px);
      width: 100%;
      background: inherit;
    }

    /* Horizontal gestures drag the sidebar closed, scroll containers inside reset the value. */
    &,
    & * {
      touch-action: pan-y pinch-zoom;
    }
  `};

  [dir="rtl"] & {
    transform: translateX(
      ${(props) => (props.$mobileSidebarVisible ? 0 : "100%")}
    );
  }

  @media print {
    display: none;
    transform: none;
  }

  & > div {
    transition: opacity 150ms ease-in-out;
    opacity: ${(props) => {
      if (props.$hidden) {
        return "0";
      }
      return "1";
    }};
  }

  ${breakpoint("desktop")`
    z-index: ${depths.sidebar};
    margin: 0;
    min-width: 0;
    transform: none;

    [dir="rtl"] & {
      transform: none;
    }
  `};
`;

export default observer(Sidebar);
