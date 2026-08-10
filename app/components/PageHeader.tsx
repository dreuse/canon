import type * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import Heading from "~/components/Heading";

interface Props {
  /** The page title. */
  title: React.ReactNode;
  /** A line of secondary text below the title. */
  caption?: React.ReactNode;
  /** Controls rendered at the end of the title row. */
  actions?: React.ReactNode;
}

/**
 * The title block at the top of an index page, with any page-level controls
 * aligned to the end of the title row.
 *
 * @param props the title, optional caption and optional actions.
 * @returns the page header element.
 */
export function PageHeader({ title, caption, actions }: Props) {
  return (
    <Container>
      <Titles>
        <Heading>{title}</Heading>
        {caption && <Caption>{caption}</Caption>}
      </Titles>
      {actions && <Actions>{actions}</Actions>}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const Titles = styled.div`
  min-width: 0;

  h1 {
    margin-top: 0;
  }
`;

const Caption = styled.p`
  margin: -12px 0 20px;
  color: ${s("textTertiary")};
  font-size: 14px;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;
