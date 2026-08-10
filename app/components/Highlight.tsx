import { escapeRegExp } from "es-toolkit/compat";
import { transparentize } from "polished";
import * as React from "react";
import replace from "string-replace-to-array";
import styled from "styled-components";
import { s } from "@shared/styles";

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  highlight: (string | null | undefined) | RegExp;
  processResult?: (tag: string) => string;
  text: string | undefined;
  caseSensitive?: boolean;
};

function Highlight({
  highlight,
  processResult,
  caseSensitive,
  text = "",
  ...rest
}: Props) {
  let regex;
  let index = 0;

  if (highlight instanceof RegExp) {
    regex = highlight;
  } else {
    regex = new RegExp(
      escapeRegExp(highlight || ""),
      caseSensitive ? "g" : "gi"
    );
  }

  return (
    <span {...rest}>
      {highlight
        ? replace(text, regex, (tag: string) => (
            <Mark key={index++}>
              {processResult ? processResult(tag) : tag}
            </Mark>
          ))
        : text}
    </span>
  );
}

export const Mark = styled.mark`
  color: ${s("text")};
  background: ${(props) =>
    transparentize(props.theme.isDark ? 0.72 : 0.8, props.theme.accent)};
  border-radius: 2px;
  padding: 0 1px;
  font-weight: inherit;
`;

export default Highlight;
