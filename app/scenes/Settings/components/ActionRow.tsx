import styled from "styled-components";
import { s } from "@shared/styles";
import { HStack } from "~/components/primitives/HStack";

/**
 * A sticky container for action buttons such as "Save" on settings screens.
 */
export const ActionRow = styled(HStack).attrs({
  spacing: 8,
})`
  position: sticky;
  bottom: 0;
  width: 100%;
  padding: 14px 0;

  border-top: 1px solid ${s("divider")};
  background: ${s("background")};
  color: ${s("textTertiaryOnTint")};
`;
