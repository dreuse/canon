import styled from "styled-components";

type Props = {
  size?: number;
  color?: string;
  className?: string;
};

const DotIcon = ({ size = 24, color, className }: Props) => (
  <Dot $color={color} $size={size} className={className} />
);

const Dot = styled.span<{ $color?: string; $size: number }>`
  display: inline-flex;
  flex: 0 0 ${(props) => props.$size}px;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;

  &::before {
    content: "";
    margin: auto;
    width: ${(props) => Math.round(props.$size / 3)}px;
    height: ${(props) => Math.round(props.$size / 3)}px;
    border-radius: 50%;
    background: ${(props) => props.$color ?? "currentColor"};
    transition: background 150ms ease-in-out;
  }
`;

export default DotIcon;
