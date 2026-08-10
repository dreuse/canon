import { observer } from "mobx-react";
import { Helmet } from "react-helmet-async";
import env from "~/env";
import { useSplitView } from "./SplitView/context";

type Props = {
  title: string;
  favicon?: string;
};

const originalShortcutHref = document
  .querySelector('link[rel="shortcut icon"]')
  ?.getAttribute("href") as string;

const PageTitle = ({ title, favicon }: Props) => {
  const { isFocused } = useSplitView();

  // Only the focused pane of a split view titles the tab, otherwise the panes
  // compete and the title depends on which rendered last.
  if (!isFocused) {
    return null;
  }

  return (
    <Helmet>
      <title>{`${title} - ${env.APP_NAME}`}</title>
      <link
        rel="shortcut icon"
        type="image/png"
        href={favicon ?? originalShortcutHref}
        key={favicon ?? originalShortcutHref}
      />
    </Helmet>
  );
};

export default observer(PageTitle);
