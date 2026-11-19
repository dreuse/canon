import { observer } from "mobx-react";
import {
  CollectionIcon,
  GlobeIcon,
  PadlockIcon,
  PlusIcon,
  ShapesIcon,
} from "outline-icons";
import { useEffect, useId } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { Pagination, PersonalCollectionId } from "@shared/constants";
import { s } from "@shared/styles";
import { TeamPreference } from "@shared/types";
import Button from "~/components/Button";
import CollectionIconOfCollection from "~/components/Icons/CollectionIcon";
import { PageHeader } from "~/components/PageHeader";
import Scene from "~/components/Scene";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import NewTemplateMenu from "~/menus/NewTemplateMenu";
import type Template from "~/models/Template";
import { newTemplatePath } from "~/utils/routeHelpers";
import { TemplateCard } from "./components/TemplateCard";

const PAGE_MAX_WIDTH = "984px";
const CARD_MIN_WIDTH = "220px";
const GROUP_ICON_SIZE = 16;

interface SectionProps {
  title: string;
  icon: ReactNode;
  count?: number;
  note: string;
  children: ReactNode;
}

function Section({ title, icon, count, note, children }: SectionProps) {
  const headingId = useId();

  return (
    <SectionContainer aria-labelledby={headingId}>
      <SectionHeader>
        <h2 id={headingId}>
          {icon}
          {title}
          {count !== undefined && <Badge>{count}</Badge>}
        </h2>
        <Note>{note}</Note>
      </SectionHeader>
      {children}
    </SectionContainer>
  );
}

function Grid({ templates }: { templates: Template[] }) {
  return (
    <CardGrid>
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </CardGrid>
  );
}

/**
 * The templates page. It lists the templates of the user, of each collection
 * and of the workspace.
 *
 * @returns the templates page.
 */
export const Templates = observer(function Templates() {
  const { t } = useTranslation();
  const { templates, collections } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const personalCollection = collections.personal;
  const showPersonal = !!team.getPreference(TeamPreference.PersonalDocs);

  useEffect(() => {
    templates
      .fetchAll({ limit: Pagination.maxLimit })
      .catch(() => toast.error(t("Could not load templates")));
  }, [templates, t]);

  const personalTemplates = templates.all.filter(
    (template) =>
      !!personalCollection && template.collectionId === personalCollection.id
  );
  const workspaceTemplates = templates.all.filter(
    (template) => !template.collectionId
  );
  const collectionGroups = collections.allActive
    .map((collection) => ({
      collection,
      templates: templates.all.filter(
        (template) => template.collectionId === collection.id
      ),
    }))
    .filter((group) => group.templates.length > 0);
  const collectionCount = collectionGroups.reduce(
    (total, group) => total + group.templates.length,
    0
  );

  return (
    <Scene measure="index" icon={<ShapesIcon />} title={t("Templates")}>
      <Page>
        <PageHeader
          title={t("Templates")}
          caption={t(
            "Ready-made structures for new documents. Yours stay private until you share them."
          )}
          actions={
            can.createTemplate &&
            (showPersonal ? (
              <Button
                as={Link}
                to={newTemplatePath(
                  personalCollection?.id ?? PersonalCollectionId
                )}
                icon={<PlusIcon />}
              >
                {t("New template")}
              </Button>
            ) : (
              <NewTemplateMenu />
            ))
          }
        />
        {showPersonal && (
          <Section
            title={t("My templates")}
            icon={<PadlockIcon size={18} />}
            count={personalTemplates.length || undefined}
            note={t(
              "Only you can see these. Share them to let your team use them."
            )}
          >
            {personalTemplates.length ? (
              <Grid templates={personalTemplates} />
            ) : (
              <EmptyState>
                <EmptyIcon>
                  <ShapesIcon size={24} />
                </EmptyIcon>
                <EmptyTitle>{t("You have no templates yet")}</EmptyTitle>
                <EmptyText>
                  {t(
                    "Create a template to repeat the structure of the documents you always write. You can also duplicate a workspace template."
                  )}
                </EmptyText>
              </EmptyState>
            )}
          </Section>
        )}
        {collectionGroups.length > 0 && (
          <Section
            title={t("Collections")}
            icon={<CollectionIcon size={18} />}
            count={collectionCount}
            note={t("Anyone with access to the collection can see these.")}
          >
            {collectionGroups.map(({ collection, templates: group }) => (
              <div key={collection.id}>
                <GroupHeading>
                  <CollectionIconOfCollection
                    collection={collection}
                    size={GROUP_ICON_SIZE}
                  />
                  {collection.displayName}
                  <Note> · {group.length}</Note>
                </GroupHeading>
                <Grid templates={group} />
              </div>
            ))}
          </Section>
        )}
        <Section
          title={t("Workspace templates")}
          icon={<GlobeIcon size={18} />}
          count={workspaceTemplates.length}
          note={t(
            "Everyone can see these. Their author and admins can edit them."
          )}
        >
          <Grid templates={workspaceTemplates} />
        </Section>
      </Page>
    </Scene>
  );
});

const Page = styled.div`
  max-width: ${PAGE_MAX_WIDTH};
  margin: 0 auto;
`;

const SectionContainer = styled.section`
  margin-bottom: 40px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-bottom: 12px;

  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: ${s("text")};
    font-size: 15px;
    font-weight: 600;
    line-height: 20px;

    svg {
      color: ${s("textSecondary")};
    }
  }
`;

const Badge = styled.span`
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 6px;
  background: ${s("listItemHoverBackground")};
  color: ${s("textSecondary")};
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  text-align: center;
`;

const Note = styled.span`
  color: ${s("textTertiary")};
  font-size: 12px;
  line-height: 16px;
`;

const GroupHeading = styled.h3`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  color: ${s("textSecondary")};
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${CARD_MIN_WIDTH}, 1fr));
  gap: 12px;
  margin-bottom: 16px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 20px;
  text-align: center;
  border: 1px dashed ${s("divider")};
  border-radius: 10px;
`;

const EmptyIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 12px;
  border-radius: 20px;
  background: ${s("listItemHoverBackground")};
  color: ${s("textSecondary")};
`;

const EmptyTitle = styled.p`
  margin: 0 0 4px;
  color: ${s("text")};
  font-size: 14px;
  font-weight: 600;
`;

const EmptyText = styled.p`
  max-width: 440px;
  margin: 0;
  color: ${s("textSecondary")};
  font-size: 13px;
  line-height: 19px;
`;
