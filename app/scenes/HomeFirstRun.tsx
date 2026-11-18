import { observer } from "mobx-react";
import { CheckmarkIcon, HomeIcon, PlusIcon, UserAddIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { actionToMenuItem } from "~/actions";
import { createCollection } from "~/actions/definitions/collections";
import { inviteUser } from "~/actions/definitions/users";
import Button from "~/components/Button";
import Scene from "~/components/Scene";
import useActionContext from "~/hooks/useActionContext";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { newDocumentPath, templatesPath } from "~/utils/routeHelpers";
import { firstLineOfText } from "./Templates/components/TemplateCard";
import { useHomeImportAction } from "./useHomeImportAction";

const TEMPLATE_CARD_LIMIT = 4;
const TEMPLATE_FETCH_LIMIT = 25;
const USERS_FETCH_LIMIT = 2;
const PERCENT = 100;
const PREVIEW_LINE_WIDTHS = ["92%", "70%", "84%"];
const TOUCH_TARGET = 44;
const DONE_MARKER_TINT = 12;

interface Step {
  key: string;
  title: string;
  description: string;
  done: boolean;
  actions?: React.ReactNode;
}

/**
 * The Home shown to a workspace with no documents yet. It lists the setup
 * steps, with their progress, and the templates to start a document from.
 *
 * @returns the first-run Home scene.
 */
export const HomeFirstRun = observer(function HomeFirstRun() {
  const { t } = useTranslation();
  const { collections, users, templates } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const can = usePolicy(team);
  const context = useActionContext({ isMenu: false, isCommandBar: false });
  const { importItem, canImport } = useHomeImportAction();
  const createCollectionItem = actionToMenuItem(createCollection, context);
  const inviteItem = actionToMenuItem(inviteUser, context);

  React.useEffect(() => {
    void users.fetchPage({ limit: USERS_FETCH_LIMIT });
  }, [users]);

  React.useEffect(() => {
    if (can.readTemplate) {
      void templates.fetchPage({ limit: TEMPLATE_FETCH_LIMIT });
    }
  }, [templates, can.readTemplate]);

  const importButton = canImport && importItem.type === "button" && (
    <GhostButton
      type="button"
      neutral
      borderOnHover
      onClick={importItem.onClick}
    >
      {t("Import files")}
    </GhostButton>
  );

  const steps: Step[] = [
    {
      key: "workspace",
      title: t("Set up the workspace"),
      description: t("Name, logo and language are set."),
      done: true,
    },
    {
      key: "collection",
      title: t("Create the first collection"),
      description: t(
        "Collections group documents by team or subject, such as Engineering or Product, and define who has access."
      ),
      done: collections.allActive.length > 0,
      actions: (
        <>
          {can.createCollection && createCollectionItem.type === "button" && (
            <Button
              type="button"
              icon={<PlusIcon />}
              onClick={createCollectionItem.onClick}
            >
              {t("Create collection")}
            </Button>
          )}
          {importButton}
        </>
      ),
    },
    {
      key: "invite",
      title: t("Invite the team"),
      description: t(
        "Invited people only see the collections you share with them."
      ),
      done: users.activeOrInvited.length > 1,
      actions: can.inviteUser && inviteItem.type === "button" && (
        <Button
          type="button"
          neutral
          icon={<UserAddIcon />}
          onClick={inviteItem.onClick}
        >
          {t("Invite people")}
        </Button>
      ),
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  const currentIndex = steps.findIndex((step) => !step.done);
  const stepsLeft = steps.length - completed;
  const starterTemplates = templates.published.slice(0, TEMPLATE_CARD_LIMIT);
  const showTemplates = can.createDocument && starterTemplates.length > 0;

  return (
    <Scene measure="index" icon={<HomeIcon />} title={t("Home")}>
      <Page>
        <h1>
          {t("Welcome to {{ teamName }}, {{ name }}", {
            teamName: team.name,
            name: user.name.split(" ")[0],
          })}
        </h1>
        <Lead>
          {t("The team records processes, decisions and knowledge here.")}
          {stepsLeft > 0 && (
            <>
              {" "}
              {t("{{ count }} steps left to get the workspace ready.", {
                count: stepsLeft,
              })}
            </>
          )}
        </Lead>

        <Progress>
          <span>
            {t("{{ completed }} of {{ total }} done", {
              completed,
              total: steps.length,
            })}
          </span>
          <ProgressTrack
            role="progressbar"
            aria-label={t("Workspace setup")}
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={completed}
          >
            <ProgressFill
              style={{ width: `${(completed / steps.length) * PERCENT}%` }}
            />
          </ProgressTrack>
        </Progress>

        <Steps>
          {steps.map((step, index) => (
            <StepCard key={step.key} $current={index === currentIndex}>
              <StepMarker $done={step.done}>
                {step.done ? (
                  <CheckmarkIcon size={16} aria-label={t("Done")} />
                ) : (
                  index + 1
                )}
              </StepMarker>
              <StepBody>
                <StepTitle>{step.title}</StepTitle>
                <StepDescription>{step.description}</StepDescription>
                {!step.done && step.actions && (
                  <StepActions>{step.actions}</StepActions>
                )}
              </StepBody>
            </StepCard>
          ))}
        </Steps>

        {showTemplates && (
          <section aria-labelledby="home-first-run-templates">
            <SectionHeading>
              <h2 id="home-first-run-templates">
                {t("Start with a template")}
              </h2>
              <TextLink to={templatesPath()}>
                {t("View all templates")}
              </TextLink>
            </SectionHeading>
            <TemplateGrid>
              {starterTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  to={newDocumentPath(template.collectionId, {
                    templateId: template.id,
                  })}
                >
                  <Preview aria-hidden="true">
                    <PreviewTitle />
                    {PREVIEW_LINE_WIDTHS.map((width) => (
                      <PreviewLine key={width} style={{ width }} />
                    ))}
                  </Preview>
                  <TemplateName>{template.displayTitle}</TemplateName>
                  <TemplateText>{firstLineOfText(template)}</TemplateText>
                </TemplateCard>
              ))}
            </TemplateGrid>
          </section>
        )}

        {canImport && importItem.type === "button" && (
          <Footer>
            <Trans
              defaults="Already use another tool? <import>Import from Markdown, Word or Notion</import>."
              components={{
                import: (
                  <ImportLink type="button" onClick={importItem.onClick} />
                ),
              }}
            />
          </Footer>
        )}
      </Page>
    </Scene>
  );
});

const Page = styled.div`
  max-width: 764px;
  margin: 0 auto;
  font-size: 14px;
  line-height: 20px;

  h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 600;
    line-height: 36px;
    letter-spacing: -0.02em;
    color: ${s("text")};
  }
`;

const Lead = styled.p`
  margin: 8px 0 0;
  font-size: 16px;
  line-height: 24px;
  color: ${s("textSecondary")};
`;

const Progress = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  font-size: 13px;
  color: ${s("textTertiary")};
`;

const ProgressTrack = styled.span`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: ${s("inputBorder")};
  overflow: hidden;
`;

const ProgressFill = styled.span`
  display: block;
  height: 100%;
  border-radius: 2px;
  background: ${s("accent")};
`;

const Steps = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
`;

const StepCard = styled.li<{ $current: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 18px 20px;
  background: ${s("cardBackground")};
  border: 1px solid
    ${(props) => (props.$current ? props.theme.inputBorder : props.theme.divider)};
  border-radius: 10px;
`;

const StepMarker = styled.span<{ $done: boolean }>`
  display: grid;
  flex: none;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid
    ${(props) => (props.$done ? props.theme.success : props.theme.placeholder)};
  border-radius: 50%;
  background: ${(props) =>
    props.$done
      ? `color-mix(in srgb, ${props.theme.success} ${DONE_MARKER_TINT}%, transparent)`
      : "transparent"};
  color: ${(props) =>
    props.$done ? props.theme.success : props.theme.textSecondary};
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  fill: currentColor;
`;

const StepBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const StepTitle = styled.p`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: ${s("text")};
`;

const StepDescription = styled.p`
  margin: 2px 0 0;
  color: ${s("textSecondary")};
`;

const StepActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
`;

const GhostButton = styled(Button)`
  color: ${s("textSecondary")};

  &:hover:not(:disabled) {
    color: ${s("text")};
  }
`;

const SectionHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 36px 0 12px;

  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    line-height: 20px;
    color: ${s("text")};
  }
`;

const textLink = `
  display: inline-flex;
  align-items: center;
  font-size: 13px;

  @media (max-width: 1024px) {
    min-height: ${TOUCH_TARGET}px;
  }
`;

const TextLink = styled(Link)`
  ${textLink}
  color: ${s("textTertiary")};

  &:hover {
    color: ${s("text")};
  }
`;

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const TemplateCard = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 12px;
  background: ${s("cardBackground")};
  border: 1px solid ${s("divider")};
  border-radius: 10px;
  color: inherit;

  &:hover {
    background: ${s("listItemHoverBackground")};
  }
`;

const Preview = styled.span`
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 76px;
  margin-bottom: 8px;
  padding: 10px;
  border: 1px solid ${s("divider")};
  border-radius: 6px;
  background: ${s("background")};
`;

const PreviewLine = styled.i`
  display: block;
  height: 5px;
  border-radius: 3px;
  background: ${s("inputBorder")};
`;

const PreviewTitle = styled(PreviewLine)`
  width: 55%;
  height: 7px;
  background: ${s("placeholder")};
`;

const TemplateName = styled.span`
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${s("text")};
`;

const TemplateText = styled.span`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 18px;
  color: ${s("textTertiary")};
`;

const Footer = styled.p`
  margin: 28px 0 0;
  font-size: 13px;
  line-height: 18px;
  color: ${s("textTertiary")};
`;

const ImportLink = styled.button`
  ${textLink}
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: ${s("link")};
  cursor: var(--pointer);

  &:hover {
    text-decoration: underline;
  }
`;
