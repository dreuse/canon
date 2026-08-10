import styled from "styled-components";
import { s } from "@shared/styles";

export const SettingGroup = styled.h2`
  margin: 34px 0 0;
  padding-top: 16px;
  border-top: 1px solid ${s("divider")};

  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.09em;
  line-height: 1.4;
  text-transform: uppercase;
  color: ${s("textTertiary")};
`;
