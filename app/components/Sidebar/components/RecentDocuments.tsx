import { observer } from "mobx-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type Document from "~/models/Document";
import { VoHistoryIcon } from "~/components/Icons/VobysIcons";
import useStores from "~/hooks/useStores";
import { documentPath } from "~/utils/routeHelpers";
import Header from "./Header";
import SidebarLink from "./SidebarLink";

const RECENT_LIMIT = 4;

const RecentDocumentLink = observer(function RecentDocumentLink({
  document,
}: {
  document: Document;
}) {
  return (
    <SidebarLink
      to={documentPath(document)}
      label={document.titleWithDefault}
    />
  );
});

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
    <Pinned>
      <Header
        id="recent"
        title={t("Recent")}
        icon={<VoHistoryIcon />}
        count={recent.length}
      >
        {recent.map((document) => (
          <RecentDocumentLink key={document.id} document={document} />
        ))}
      </Header>
    </Pinned>
  );
}

const Pinned = styled.div`
  flex-shrink: 0;
  padding-block: 8px;
  border-block: 1px solid ${s("divider")};
`;

export default observer(RecentDocuments);
