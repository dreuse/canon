import * as React from "react";
import styled from "styled-components";
import Heading from "~/components/Heading";
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
  margin: 0 0 4px;
  text-wrap: pretty;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 48px 0 8px;

  h1 {
    margin: 0;
  }
`;
