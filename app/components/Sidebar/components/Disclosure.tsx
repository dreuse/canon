import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { extraArea, s } from "@shared/styles";
import NudeButton from "~/components/NudeButton";
import {
  VoChevronDownIcon,
  VoChevronRightIcon,
} from "~/components/Icons/VobysIcons";

type Props = React.ComponentProps<typeof Button> & {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  expanded: boolean;
};

function Disclosure({ onClick, expanded, ...rest }: Props) {
  const { t } = useTranslation();

  return (
    <Button
      size={20}
      onClick={onClick}
      aria-label={expanded ? t("Collapse") : t("Expand")}
      aria-expanded={expanded}
      {...rest}
    >
      {expanded ? (
        <VoChevronDownIcon size={16} />
      ) : (
        <VoChevronRightIcon size={16} />
      )}
    </Button>
  );
}

const Button = styled(NudeButton)`
  position: absolute;
  inset-inline-start: -24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${s("textSecondary")};
  margin: 2px;
  opacity: 1;
  transition: opacity 100ms ease;
  ${extraArea(4)}

  &[aria-expanded="false"] {
    opacity: 0.2;
  }

  &:hover {
    opacity: 1;
    color: ${s("text")};
    background: ${s("sidebarControlHoverBackground")};
  }
`;

// Enables identifying this component within styled components
const StyledDisclosure = styled(Disclosure)``;

export default StyledDisclosure;
