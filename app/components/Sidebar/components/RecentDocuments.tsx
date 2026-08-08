import { observer } from "mobx-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import useStores from "~/hooks/useStores";
import { documentPath } from "~/utils/routeHelpers";
import Header from "./Header";
import SidebarLink from "./SidebarLink";

const RECENT_LIMIT = 4;

function RecentDocuments() {
  const { documents } = useStores();
  const { t } = useTranslation();

  useEffect(() => {
    void documents.fetchRecentlyViewed({ limit: RECENT_LIMIT });
  }, [documents]);

  const recent = documents.recentlyViewed.slice(0, RECENT_LIMIT);

  if (!recent.length) {
    return null;
  }

  return (
    <Header id="recent" title={t("Recent")}>
      {recent.map((document) => (
        <SidebarLink
          key={document.id}
          to={documentPath(document)}
          label={document.titleWithDefault}
        />
      ))}
    </Header>
  );
}

export default observer(RecentDocuments);
