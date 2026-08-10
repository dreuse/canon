import { transparentize } from "polished";
import styled from "styled-components";
import { s } from "@shared/styles";

const Input = styled.input`
  font-size: 15px;
  background: ${s("backgroundSecondary")};
  color: ${s("text")};
  border: 1px solid ${s("divider")};
  border-radius: 6px;
  padding: 5px 8px;
  margin: 0;
  outline: none;
  flex-grow: 1;
  min-width: 0;

  &:focus {
    border-color: ${s("inputBorderFocused")};
  }

  &::placeholder {
    color: ${(props) => transparentize(0.5, props.theme.text)};
  }

  @media (hover: none) and (pointer: coarse) {
    font-size: 16px;
    height: 34px;
  }
`;

export default Input;
