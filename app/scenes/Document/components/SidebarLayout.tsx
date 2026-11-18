import { observer } from "mobx-react";
import { BackIcon, CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s, ellipsis, breakpoints } from "@shared/styles";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { HEADER_HEIGHT } from "~/components/Header";
import { PortalContext } from "~/components/Portal";
import { RightSidebarWrappedContext } from "~/components/RightSidebarContext";
import Scrollable from "~/components/Scrollable";
import Aside from "~/components/Sidebar/Aside";
import Tooltip from "~/components/Tooltip";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "~/components/primitives/Drawer";
import useMediaQuery from "~/hooks/useMediaQuery";
import useMobile from "~/hooks/useMobile";
import { draggableOnDesktop } from "~/styles";

type Props = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  /* The title of the sidebar */
  title: React.ReactNode;
  /* The content of the sidebar */
  children: React.ReactNode;
  /* Called when the sidebar is closed */
  onClose?: () => void;
  /* Whether the sidebar should be scrollable */
  scrollable?: boolean;
  /* Accessible label of the close button shown when the sidebar is an overlay */
  closeLabel?: string;
};

const TOUCH_TARGET = 44;

function SidebarLayout({
  title,
  onClose,
  children,
  className,
  scrollable = true,
  closeLabel,
}: Props) {
  const { t } = useTranslation();
  const isMobile = useMobile();
  const isOverlay = !useMediaQuery(`(min-width: ${breakpoints.desktop}px)`);
  const isWrapped = React.useContext(RightSidebarWrappedContext);
  const [drawerElement, setDrawerElement] =
    React.useState<HTMLDivElement | null>(null);

  const content = scrollable ? (
    <Scrollable hiddenScrollbars topShadow>
      {children}
    </Scrollable>
  ) : (
    children
  );

  if (isOverlay) {
    return (
      <Drawer
        onClose={onClose}
        direction={isMobile ? "bottom" : "right"}
        defaultOpen
      >
        <DrawerContent ref={setDrawerElement} className={className}>
          <DrawerTitle hidden>{title}</DrawerTitle>
          <Header>
            <Title aria-hidden>{title}</Title>
            <CloseButton
              type="button"
              aria-label={closeLabel ?? t("Close")}
              onClick={onClose}
            >
              <CloseIcon />
            </CloseButton>
          </Header>
          <PortalContext.Provider value={drawerElement}>
            {content}
          </PortalContext.Provider>
        </DrawerContent>
      </Drawer>
    );
  }

  const inner = (
    <Container className={className}>
      <Header>
        <Title>{title}</Title>
        <Tooltip content={t("Close")} shortcut="Esc">
          <Button
            icon={<ForwardIcon />}
            onClick={onClose}
            borderOnHover
            neutral
          />
        </Tooltip>
      </Header>
      {content}
    </Container>
  );

  if (isWrapped) {
    return inner;
  }

  return <Aside>{inner}</Aside>;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
`;

const ForwardIcon = styled(BackIcon)`
  transform: rotate(180deg);
  flex-shrink: 0;

  [dir="rtl"] & {
    transform: rotate(0deg);
  }
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${TOUCH_TARGET}px;
  height: ${TOUCH_TARGET}px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${s("textSecondary")};
  cursor: var(--pointer);
`;

const Title = styled(Flex)`
  ${ellipsis()}
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  align-items: center;
  justify-content: flex-start;
  user-select: none;
  width: 0;
  flex-grow: 1;
`;

const Header = styled(Flex)`
  ${draggableOnDesktop()}
  align-items: center;
  position: relative;
  padding-block: 12px;
  padding-inline: 16px 12px;
  min-height: ${HEADER_HEIGHT}px;
  color: ${s("text")};
  flex-shrink: 0;
`;

export default observer(SidebarLayout);
