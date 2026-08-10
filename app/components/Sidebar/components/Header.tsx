import * as React from "react";
import styled, { keyframes } from "styled-components";
import { extraArea, s } from "@shared/styles";
import {
  VoChevronDownIcon,
  VoChevronRightIcon,
} from "~/components/Icons/VobysIcons";
import usePersistedState from "~/hooks/usePersistedState";
import { undraggableOnDesktop } from "~/styles";
import SidebarLink from "./SidebarLink";

type Props = {
  /** Unique header id – if passed the header will become toggleable */
  id?: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  actions?: React.ReactNode;
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
  children,
}: Props) => {
  const [firstRender, setFirstRender] = React.useState(true);
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
        icon={icon}
        label={title}
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
      <H3>
        <Button onClick={handleClick} disabled={!id}>
          {title}
          {id && <Disclosure $expanded={expanded} size={16} />}
        </Button>
        {actions && <Actions>{actions}</Actions>}
      </H3>
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
  display: inline-flex;
  align-items: center;
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
  ${extraArea(4)}

  &:not(:disabled):hover,
  &:not(:disabled):active {
    color: ${s("textSecondary")};
    cursor: var(--pointer);
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

  &:hover svg {
    opacity: 0.9;
  }
`;

const H3 = styled.h3`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;

  &:hover,
  &:focus-within {
    ${Disclosure} {
      opacity: 1;
    }
  }
`;

export default Header;
