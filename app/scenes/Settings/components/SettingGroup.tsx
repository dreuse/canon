import styled from "styled-components";
import { s } from "@shared/styles";

export const SettingGroup = styled.h2`
  margin: 34px 0 0;
  padding-top: 16px;
  border-top: 1px solid ${s("divider")};

  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
  color: ${s("text")};
`;
