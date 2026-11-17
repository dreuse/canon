import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { keyframes } from "styled-components";
import { s } from "@shared/styles";
import { ActionSeparator, createRootMenuAction, resolve } from "~/actions";
import {
  VoChevronDownIcon,
  VoChevronRightIcon,
} from "~/components/Icons/VobysIcons";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import NudeButton from "~/components/NudeButton";
import useActionContext from "~/hooks/useActionContext";
import usePersistedState from "~/hooks/usePersistedState";
import { undraggableOnDesktop } from "~/styles";
import type { Action, ActionVariant } from "~/types";
import SidebarLink from "./SidebarLink";
import { SidebarSectionContext } from "./DraggableSection";
import { hoveredOrMenuOpen } from "./SidebarActions";

type Props = {
  /** Unique header id – if passed the header will become toggleable */
  id?: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  /** Actions shown at the top of the header's context menu */
  actions?: ActionVariant[];
  /** Action rendered as an icon button beside the header's menu button */
  primaryAction?: Action;
  children?: React.ReactNode;
};

export function getHeaderExpandedKey(id: string) {
  return `sidebar-header-${id}`;
}

/**
 * Toggleable sidebar header
 */
export const Header: React.FC<Props> = ({
  id,
  title,
  icon,
  count,
  actions,
  primaryAction,
  children,
}: Props) => {
  const { t } = useTranslation();
  const actionContext = useActionContext({ isButton: true });
  const [firstRender, setFirstRender] = React.useState(true);
  const sectionContext = React.useContext(SidebarSectionContext);
  const dragRef = sectionContext?.dragRef;
  const sectionActions = sectionContext?.menuActions;
  const hasMenu = !!(actions?.length || sectionActions?.length);

  // Dangling separators are trimmed when the menu items are rendered.
  const menuAction = React.useMemo(
    () =>
      createRootMenuAction([
        ...(actions ?? []),
        ActionSeparator,
        ...(sectionActions ?? []),
      ]),
    [actions, sectionActions]
  );
  const [expanded, setExpanded] = usePersistedState<boolean>(
    getHeaderExpandedKey(id ?? ""),
    true
  );

  React.useEffect(() => {
    if (!expanded) {
      setFirstRender(false);
    }
  }, [expanded]);

  const handleClick = React.useCallback(() => {
    setExpanded(!expanded);
  }, [expanded, setExpanded]);

  if (id && !expanded && icon) {
    return (
      <SidebarLink
        onClick={handleClick}
        innerRef={dragRef ? (element) => dragRef(element ?? null) : undefined}
        icon={icon}
        label={title}
        contextAction={hasMenu ? menuAction : undefined}
        trailing={
          <Meta>
            {count !== undefined && count > 0 && <Count>{count}</Count>}
            <VoChevronRightIcon size={16} />
          </Meta>
        }
      />
    );
  }

  return (
    <>
      <ContextMenu
        action={hasMenu ? menuAction : undefined}
        ariaLabel={t("Section options")}
      >
        <H3 ref={dragRef}>
          <Button onClick={handleClick} disabled={!id}>
            {title}
            {id && <Disclosure $expanded={expanded} size={16} />}
          </Button>
          {hasMenu && (
            <Actions>
              {primaryAction && (
                <NudeButton
                  action={primaryAction}
                  hideOnActionDisabled
                  tooltip={{
                    content: resolve<string>(primaryAction.name, actionContext),
                  }}
                >
                  {resolve<React.ReactNode>(primaryAction.icon, actionContext)}
                </NudeButton>
              )}
              <Overflow>
                <DropdownMenu
                  action={menuAction}
                  align="end"
                  ariaLabel={t("Section options")}
                >
                  <OverflowMenuButton />
                </DropdownMenu>
              </Overflow>
            </Actions>
          )}
        </H3>
      </ContextMenu>
      {expanded && (firstRender ? children : <Fade>{children}</Fade>)}
    </>
  );
};

export const fadeAndSlideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0px);
  }
`;

const Fade = styled.span`
  animation: ${fadeAndSlideDown} 100ms ease-in-out;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  user-select: none;
  color: ${s("textTertiaryOnTint")};
  position: relative;
  letter-spacing: 0.07em;
  margin: 0;
  padding-block: 4px;
  padding-inline: 12px 2px;
  border: 0;
  background: none;
  border-radius: 4px;
  -webkit-appearance: none;
  transition: all 100ms ease;
  ${undraggableOnDesktop()}

  &:not(:disabled):hover,
  &:not(:disabled):active {
    background: ${s("sidebarHoverBackground")};
    cursor: var(--pointer);
  }

  @media (hover: hover) {
    &:not(:disabled):hover {
      color: ${s("text")};
    }
  }
`;

const Disclosure = styled(VoChevronDownIcon)<{ $expanded?: boolean }>`
  margin-inline-start: 2px;
  transition:
    opacity 100ms ease,
    transform 100ms ease;
  ${(props) => !props.$expanded && "transform: rotate(-90deg);"};
  opacity: ${(props) => (props.$expanded ? 0 : 1)};

  [dir="rtl"] & {
    ${(props) => !props.$expanded && "transform: rotate(90deg);"};
  }
`;

const Meta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  align-self: center;
  margin-inline-start: 8px;
  color: ${s("textTertiaryOnTint")};
`;

const Count = styled.span`
  font-size: 11.5px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
`;

const Actions = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding-inline-end: 12px;
  color: ${s("text")};

  svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
    opacity: 0.6;
  }

  ${NudeButton}:hover svg,
  ${NudeButton}[aria-expanded="true"] svg {
    opacity: 0.9;
  }
`;

const Overflow = styled.span`
  display: inline-flex;
  visibility: hidden;

  @media (hover: none) {
    visibility: visible;
  }
`;

const H3 = styled.h3`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;

  ${hoveredOrMenuOpen},
  &:focus-within {
    ${Disclosure} {
      opacity: 1;
    }

    ${Overflow} {
      visibility: visible;
    }
  }
`;

export default Header;
