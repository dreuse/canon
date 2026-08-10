import { observer } from "mobx-react";
import { SidebarIcon } from "outline-icons";
import { useEffect, useState, useRef } from "react";
import {
  DragActiveProvider,
  SidebarScrollProvider,
} from "./components/DragActiveContext";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
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
import DragPlaceholder from "./components/DragPlaceholder";
import { DismissableSidebarAction } from "./components/DismissableSidebarAction";
import HistoryNavigation from "./components/HistoryNavigation";
import RecentDocuments from "./components/RecentDocuments";
import Section from "./components/Section";
import SharedWithMe from "./components/SharedWithMe";
import SidebarButton from "./components/SidebarButton";
import SidebarNav, { SidebarSystemActions } from "./components/SidebarNav";
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
    void collections.fetchAll();

    if (!user.isViewer) {
      void documents.fetchDrafts();
    }
  }, [documents, collections, user.isViewer]);

  // Scrollable reads ref.current internally for its shadow/ResizeObserver
  // logic, so we must pass an object ref — a callback ref would leave those
  // reads undefined. We mirror the attached node into state so the
  // SidebarScrollProvider can re-render descendants with the scroll element.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollArea, setScrollArea] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setScrollArea(scrollRef.current);
  }, []);

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
        <Scrollable flex shadow ref={scrollRef}>
          <SidebarScrollProvider value={scrollArea}>
            <Section>
              <Starred />
            </Section>
            <Section>
              <SharedWithMe />
            </Section>
            <Section>
              <Collections />
            </Section>
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
