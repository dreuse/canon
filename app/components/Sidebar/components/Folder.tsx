import styled from "styled-components";
import { s } from "@shared/styles";

type Props = {
  expanded: boolean;
  depth?: number;
  children?: React.ReactNode;
};

const DEPTH_STEP = 16;

const RULE_OFFSET_FROM_LABEL = 4;

const Folder: React.FC<Props> = ({ expanded, depth, children }: Props) => {
  if (!expanded) {
    return null;
  }

  if (depth === undefined) {
    return <>{children}</>;
  }

  const ruleOffset = depth * DEPTH_STEP + RULE_OFFSET_FROM_LABEL;

  return (
    <Guided
      style={
        { "--guide-rule-offset": `${ruleOffset}px` } as React.CSSProperties
      }
    >
      {children}
    </Guided>
  );
};

const Guided = styled.div`
  position: relative;

  &:before {
    content: "";
    position: absolute;
    inset-block: 2px;
    inset-inline-start: var(--guide-rule-offset);
    width: 1px;
    background: ${s("divider")};
    pointer-events: none;
    z-index: 1;
  }
`;

export default Folder;
