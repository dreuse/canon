import * as React from "react";
import styled from "styled-components";
import Heading from "~/components/Heading";
import { s } from "@shared/styles";
import Text from "~/components/Text";
import { HStack } from "~/components/primitives/HStack";

interface Props {
  title: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function SettingsTitle({ title, actions, children }: Props) {
  return (
    <>
      <TitleRow>
        <Heading>{title}</Heading>
        {actions ? <HStack spacing={8}>{actions}</HStack> : null}
      </TitleRow>
      {children ? (
        <SettingsIntro as="p" type="secondary">
          {children}
        </SettingsIntro>
      ) : null}
    </>
  );
}

export const SettingsIntro = styled(Text)`
  max-width: 70ch;
  margin: 6px 0 4px;
  font-size: 14px;
  line-height: 20px;
  color: ${s("textSecondary")};
  text-wrap: pretty;
`;

const TitleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin: 48px 0 8px;

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    line-height: 32px;
    letter-spacing: -0.01em;
  }
`;
