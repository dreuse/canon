type Props = {
  expanded: boolean;
  depth?: number;
  children?: React.ReactNode;
};

export const DEPTH_STEP = 12;

const Folder: React.FC<Props> = ({ expanded, children }: Props) => {
  if (!expanded) {
    return null;
  }

  return <>{children}</>;
};

export default Folder;
