import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import styled from "styled-components";
import useBelowDesktop from "~/hooks/useBelowDesktop";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { DrawerNav } from "./Drawer";
import { Rail, RailPanel, type RailPanelId } from "./Rail";
import Sidebar from "./Sidebar";
import { DragActiveProvider } from "./components/DragActiveContext";
import DragPlaceholder from "./components/DragPlaceholder";
import HistoryNavigation from "./components/HistoryNavigation";

function AppSidebar() {
  const { documents, ui, collections } = useStores();
  const user = useCurrentUser();
  const belowDesktop = useBelowDesktop();
  const [panel, setPanel] = useState<RailPanelId>("collections");

  useEffect(() => {
    void collections.fetchAllIfNeeded();

    if (!user.isViewer) {
      void documents.fetchDrafts();
    }
  }, [documents, collections, user.isViewer]);

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
