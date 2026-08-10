import { transparentize } from "polished";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Flex from "~/components/Flex";
import Text from "~/components/Text";

type Props = {
  children?: React.ReactNode;
  label: React.ReactNode;
  description?: React.ReactNode;
  name: string;
  visible?: boolean;
  border?: boolean;
  compact?: boolean;
};

const CONTROL_COLUMN_WIDTH = 300;

const Row = styled(Flex)<{ $border?: boolean; $compact?: boolean }>`
  flex-direction: column;
  gap: 10px;
  padding: ${(props) => (props.$compact ? "14px 0" : "20px 0")};
  border-bottom: 1px solid
    ${(props) =>
      props.$border === false
        ? "transparent"
        : transparentize(0.5, props.theme.divider)};

  &:last-child {
    border-bottom: 0;
  }

  ${breakpoint("tablet")`
    flex-direction: row;
    gap: 40px;
    align-items: ${(props: { $compact?: boolean }) =>
      props.$compact ? "center" : "flex-start"};
  `}
`;

const LabelColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;

  ${breakpoint("tablet")`
    p {
      margin-bottom: 0;
    }
  `};
`;

const ControlColumn = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;

  > * {
    align-self: flex-start;
  }

  ${breakpoint("tablet")`
    flex: 0 0 ${CONTROL_COLUMN_WIDTH}px;
    width: ${CONTROL_COLUMN_WIDTH}px;

    > * {
      align-self: flex-end;
    }
  `}
`;

const Label = styled(Text)`
  margin-bottom: 4px;
`;

const SettingRow: React.FC<Props> = ({
  visible,
  description,
  compact,
  name,
  label,
  border,
  children,
}: Props) => {
  if (visible === false) {
    return null;
  }

  return (
    <Row $border={border} $compact={compact}>
      <LabelColumn>
        <Label as="h3">
          <label htmlFor={name}>{label}</label>
        </Label>
        {description && (
          <Text as="p" type="secondary">
            {description}
          </Text>
        )}
      </LabelColumn>
      <ControlColumn>{children}</ControlColumn>
    </Row>
  );
};

export default SettingRow;
