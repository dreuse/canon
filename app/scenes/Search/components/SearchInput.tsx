import { CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import { s, hover } from "@shared/styles";
import Flex from "~/components/Flex";
import { VoSearchIcon } from "~/components/Icons/VobysIcons";
import NudeButton from "~/components/NudeButton";

interface Props extends React.HTMLAttributes<HTMLInputElement> {
  name: string;
  defaultValue: string;
  onClear?: () => void;
}

function SearchInput(
  { defaultValue, onClear, ...rest }: Props,
  ref: React.RefObject<HTMLInputElement>
) {
  const { t } = useTranslation();
  const theme = useTheme();
  const focusInput = React.useCallback(() => {
    ref.current?.focus();
  }, [ref]);

  React.useEffect(() => {
    // ensure that focus is placed at end of input
    const len = (defaultValue || "").length;
    ref.current?.setSelectionRange(len, len);
    const timeoutId = setTimeout(() => {
      focusInput();
    }, 100); // arbitrary number

    return () => {
      clearTimeout(timeoutId);
    };
  }, [ref, defaultValue, focusInput]);

  return (
    <Wrapper align="center">
      <StyledIcon size={18} color={theme.textTertiary} onClick={focusInput} />
      <StyledInput
        {...rest}
        defaultValue={defaultValue}
        ref={ref}
        spellCheck="false"
        type="search"
        autoFocus
      />
      {defaultValue && onClear && (
        <ClearButton aria-label={t("Clear")} onClick={onClear}>
          <CloseIcon size={18} />
        </ClearButton>
      )}
    </Wrapper>
  );
}

const Wrapper = styled(Flex)`
  position: relative;
  margin-bottom: 12px;
`;

const StyledInput = styled.input`
  width: 100%;
  height: 44px;
  padding-block: 0;
  padding-inline: 42px 40px;
  font-size: 16px;
  font-weight: 400;
  outline: none;
  border: 1px solid ${s("inputBorder")};
  background: ${s("background")};
  border-radius: 10px;
  color: ${s("text")};
  transition: border-color 100ms ease;

  &:focus {
    border-color: ${s("inputBorderFocused")};
  }

  ::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }
  ::-webkit-input-placeholder {
    color: ${s("placeholder")};
  }
  :-moz-placeholder {
    color: ${s("placeholder")};
  }
  ::-moz-placeholder {
    color: ${s("placeholder")};
  }
  :-ms-input-placeholder {
    color: ${s("placeholder")};
  }
`;

const StyledIcon = styled(VoSearchIcon)`
  position: absolute;
  inset-inline-start: 13px;
`;

const ClearButton = styled(NudeButton)`
  position: absolute;
  inset-inline-end: 8px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: ${s("textTertiary")};

  &: ${hover} {
    color: ${s("text")};
    background: ${s("sidebarControlHoverBackground")};
  }
`;

export default React.forwardRef(SearchInput);
