import { observer } from "mobx-react";
import { useEffect } from "react";
import styled from "styled-components";
import { Pagination } from "@shared/constants";
import useBelowDesktop from "~/hooks/useBelowDesktop";
import usePersistedState from "~/hooks/usePersistedState";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { DrawerNav } from "./Drawer";
import {
  RAIL_PANEL_STORAGE_KEY,
  Rail,
  RailPanel,
  type RailPanelId,
  toRailPanelId,
} from "./Rail";
import Sidebar from "./Sidebar";
import { DragActiveProvider } from "./components/DragActiveContext";
import DragPlaceholder from "./components/DragPlaceholder";
import HistoryNavigation from "./components/HistoryNavigation";

function AppSidebar() {
  const { documents, ui, collections, stars, userMemberships } = useStores();
  const user = useCurrentUser();
  const belowDesktop = useBelowDesktop();
  const [storedPanel, setPanel] = usePersistedState<RailPanelId>(
    RAIL_PANEL_STORAGE_KEY,
    "collections"
  );
  const panel = toRailPanelId(storedPanel);

  useEffect(() => {
    void collections.fetchAllIfNeeded();
    void stars.fetchPage();
    void userMemberships.fetchPage({ limit: Pagination.sidebarLimit });

    if (!user.isViewer) {
      void documents.fetchDrafts();
    }
  }, [documents, collections, stars, userMemberships, user.isViewer]);

  return (
    <Sidebar
      hidden={!ui.readyToShow}
      showAccountMenu={false}
      drawer={belowDesktop}
    >
      <DragActiveProvider>
        <DragPlaceholder />
        {belowDesktop ? (
          <DrawerNav />
        ) : (
          <Shell>
            <Rail panel={panel} onPanelChange={setPanel} />
            <RailPanel panel={panel} hidden={ui.sidebarIsClosed} />
          </Shell>
        )}
      </DragActiveProvider>
      <HistoryNavigation />
    </Sidebar>
  );
}

const Shell = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

export default observer(AppSidebar);
