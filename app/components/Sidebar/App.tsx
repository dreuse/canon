import { observer } from "mobx-react";
import { SidebarIcon } from "outline-icons";
import { useEffect, useState } from "react";
import {
  DragActiveProvider,
  SidebarScrollProvider,
} from "./components/DragActiveContext";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { SidebarSection, UserPreference } from "@shared/types";
import { metaDisplay } from "@shared/utils/keyboard";
import InputSearchPage from "~/components/InputSearchPage";
import Scrollable from "~/components/Scrollable";
import { navigateToImport } from "~/actions/definitions/navigation";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import TeamLogo from "../TeamLogo";
import Tooltip from "../Tooltip";
import Sidebar from "./Sidebar";
import Collections from "./components/Collections";
import DraggableSection, {
  normalizeSidebarSectionOrder,
} from "./components/DraggableSection";
import DragPlaceholder from "./components/DragPlaceholder";
import { DismissableSidebarAction } from "./components/DismissableSidebarAction";
import HistoryNavigation from "./components/HistoryNavigation";
import RecentDocuments from "./components/RecentDocuments";
import { PersonalDocs } from "./components/PersonalDocs";
import Section from "./components/Section";
import SharedWithMe from "./components/SharedWithMe";
import SidebarButton from "./components/SidebarButton";
import SidebarNav, { SidebarSystemActions } from "./components/SidebarNav";
import { SidebarNavigationProvider } from "./components/SidebarNavigation";
import Starred from "./components/Starred";
import ToggleButton from "./components/ToggleButton";
import useMobile from "~/hooks/useMobile";

function AppSidebar() {
  const { t } = useTranslation();
  const { documents, ui, collections } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const isMobile = useMobile();

  useEffect(() => {
    void collections.fetchAllIfNeeded();

    if (!user.isViewer) {
      void documents.fetchDrafts();
    }
  }, [documents, collections, user.isViewer]);

  // Hold the scroll element in state so the SidebarScrollProvider can
  // re-render descendants with it.
  const [scrollArea, setScrollArea] = useState<HTMLElement | null>(null);

  const sectionOrder = normalizeSidebarSectionOrder(
    user.getPreference(UserPreference.SidebarSectionOrder, [])
  );

  const sectionContent = {
    [SidebarSection.Starred]: <Starred />,
    [SidebarSection.SharedWithMe]: <SharedWithMe />,
    [SidebarSection.Collections]: <Collections />,
    [SidebarSection.Personal]: <PersonalDocs />,
  };

  return (
    <Sidebar hidden={!ui.readyToShow} accountActions={<SidebarSystemActions />}>
      <DragActiveProvider>
        <DragPlaceholder />

        <SidebarButton
          title={team.name}
          image={<TeamLogo model={team} size={24} alt={t("Logo")} />}
        >
          {isMobile ? null : (
            <Tooltip
              content={t("Toggle sidebar")}
              shortcut={`${metaDisplay}+.`}
            >
              <ToggleButton
                position="bottom"
                image={<SidebarIcon size={16} />}
                aria-label={
                  ui.sidebarCollapsed
                    ? t("Expand sidebar")
                    : t("Collapse sidebar")
                }
                style={{ paddingInline: 4 }}
                onClick={() => {
                  ui.toggleCollapsedSidebar();
                  (document.activeElement as HTMLElement)?.blur();
                }}
              />
            </Tooltip>
          )}
        </SidebarButton>
        <Overflow>
          <SearchField>
            <InputSearchPage
              source="sidebar"
              label={t("Search documents")}
              labelHidden
              placeholder={`${t("Search docs")}…`}
            />
          </SearchField>
          <SidebarNav />
        </Overflow>
        <Scrollable flex shadow ref={setScrollArea}>
          <SidebarScrollProvider value={scrollArea}>
            <SidebarNavigationProvider>
              {sectionOrder.map((section) => (
                <DraggableSection key={section} section={section}>
                  {sectionContent[section]}
                </DraggableSection>
              ))}
            </SidebarNavigationProvider>
            <Section auto>
              <DismissableSidebarAction
                id="sidebar-import-hidden"
                action={navigateToImport}
              />
            </Section>
          </SidebarScrollProvider>
        </Scrollable>
        <RecentDocuments />
      </DragActiveProvider>
      <HistoryNavigation />
    </Sidebar>
  );
}

const Overflow = styled.div`
  overflow: hidden;
  flex-shrink: 0;
`;

const SearchField = styled.div`
  padding: 0 12px 8px;
`;

export default observer(AppSidebar);
