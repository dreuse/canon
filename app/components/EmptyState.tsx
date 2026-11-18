import type * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";

interface Props {
  /** Icon shown in the round badge. */
  icon: React.ReactNode;
  /** Short statement of what the page holds. */
  title: string;
  /** What to do next. */
  description: string;
  /** Tighter padding, for popovers. */
  compact?: boolean;
}

/**
 * Centered empty state with an icon badge, a title and a description.
 *
 * @param props the icon, title, description and spacing.
 * @returns the empty state element.
 */
export function EmptyState({ icon, title, description, compact }: Props) {
  return (
    <Container $compact={compact}>
      <IconBadge aria-hidden="true">{icon}</IconBadge>
      <Title>{title}</Title>
      <Description>{description}</Description>
    </Container>
  );
}

const Container = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${(props) => (props.$compact ? "40px 24px" : "56px 20px")};
  text-align: center;
`;

const IconBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${s("backgroundSecondary")};
  color: ${s("textSecondary")};
`;

const Title = styled.span`
  margin-top: 16px;
  font-size: 15px;
  font-weight: 600;
  color: ${s("text")};
`;

const Description = styled.span`
  max-width: 360px;
  margin-top: 6px;
  font-size: 13px;
  line-height: 19px;
  color: ${s("textTertiary")};
`;

export const EmptyStateCard = styled.div`
  border: 1px solid ${s("divider")};
  border-radius: 8px;
`;
