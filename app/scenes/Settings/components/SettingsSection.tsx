import { transparentize } from "polished";
import * as React from "react";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import Text from "~/components/Text";
import { SettingGroup } from "./SettingGroup";

interface Props {
  /** The section heading. */
  title: React.ReactNode;
  /** Optional text shown below the heading. */
  description?: React.ReactNode;
  /** Whether the section holds destructive actions. */
  danger?: boolean;
  /** The rows in the section, usually SettingRow components. */
  children: React.ReactNode;
}

/**
 * A titled group of setting rows on a settings screen.
 *
 * @param props the section props.
 * @returns the section element.
 */
export function SettingsSection({
  title,
  description,
  danger,
  children,
}: Props) {
  const titleId = React.useId();

  return (
    <section aria-labelledby={titleId}>
      <SettingGroup id={titleId}>{title}</SettingGroup>
      {description && (
        <Description as="p">
          {description}
        </Description>
      )}
      <Rows $danger={danger}>{children}</Rows>
    </section>
  );
}

export const Description = styled(Text)`
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 18px;
  color: ${s("textTertiary")};
`;

const Rows = styled.div<{ $danger?: boolean }>`
  ${(props) =>
    props.$danger &&
    css`
      /* Inset by the shadow width so the shadow aligns with the content. */
      margin: 24px 8px 8px;
      padding: 0 16px;
      border: 1px solid ${transparentize(0.6, props.theme.danger)};
      border-radius: 8px;
      box-shadow: 0 0 0 8px ${transparentize(0.9, props.theme.danger)};
    `}
`;
