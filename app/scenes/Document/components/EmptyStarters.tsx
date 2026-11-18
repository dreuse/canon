import { observer } from "mobx-react";
import { ImportIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import useShare from "@shared/hooks/useShare";
import { breakpoint } from "@shared/styles/breakpoint";
import { s } from "@shared/styles";
import { TextHelper } from "@shared/utils/TextHelper";
import type Document from "~/models/Document";
import type Template from "~/models/Template";
import { useDocumentContext } from "~/components/DocumentContext";
import { DialogTitle } from "~/components/DialogTitle";
import { VoDocumentIcon, VoTemplateIcon } from "~/components/Icons/VobysIcons";
import { ImportDocumentDialog } from "~/components/ImportDocumentDialog";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { settingsPath } from "~/utils/routeHelpers";

const MAX_COLLECTION_TEMPLATES = 3;
const STRUCTURE_HEADING_LEVEL = 2;
const IMPORT_DIALOG_WIDTH = "640px";

interface StartersOptions {
  document: Document | Template;
  readOnly?: boolean;
  template?: boolean;
}

/**
 * Whether the empty-document starters should be offered: the viewer can edit,
 * this is not a shared view or a template, and the body has no text yet.
 *
 * @param options the document and how it is being viewed.
 * @returns true when the starters should show.
 */
export function useShowStarters({
  document,
  readOnly,
  template,
}: StartersOptions) {
  const { shareId } = useShare();
  const can = usePolicy(document);
  const { isBodyEmpty } = useDocumentContext();
  return !readOnly && !!can.update && !shareId && !template && isBodyEmpty;
}

type Props = StartersOptions & {
  onSelectTemplate: (template: Template) => void;
};

/**
 * A list of ways to start an empty document: collection templates, a section
 * outline, a file import and a link to all templates.
 */
export const EmptyStarters = observer(function EmptyStarters({
  onSelectTemplate,
  ...options
}: Props) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const { templates, collections, dialogs } = useStores();
  const { editor } = useDocumentContext();
  const { collectionId } = options.document;
  const collection = collectionId ? collections.get(collectionId) : undefined;
  const canImport = usePolicy(collectionId ?? "").createDocument;
  const show = useShowStarters(options);
  const headingId = React.useId();

  React.useEffect(() => {
    void templates.fetchAllIfNeeded();
  }, [templates]);

  const collectionTemplates = templates.published
    .filter(
      (template) =>
        !template.isWorkspaceTemplate && template.collectionId === collectionId
    )
    .slice(0, MAX_COLLECTION_TEMPLATES);

  const handleInsertStructure = React.useCallback(() => {
    if (!editor) {
      return;
    }
    const { view } = editor;
    const { schema, tr, doc } = view.state;
    const sections = [
      t("Summary"),
      t("Context"),
      t("Steps"),
      t("References"),
    ].flatMap((title) => [
      schema.nodes.heading.create(
        { level: STRUCTURE_HEADING_LEVEL },
        schema.text(title)
      ),
      schema.nodes.paragraph.create(),
    ]);
    view.dispatch(tr.replaceWith(0, doc.content.size, sections));
    view.focus();
  }, [editor, t]);

  const handleImport = React.useCallback(() => {
    dialogs.openModal({
      title: <DialogTitle title={t("Import documents")} />,
      width: IMPORT_DIALOG_WIDTH,
      content: (
        <ImportDocumentDialog
          collectionId={collectionId}
          onSubmit={dialogs.closeAllModals}
        />
      ),
    });
  }, [dialogs, collectionId, t]);

  if (!show) {
    return null;
  }

  return (
    <Wrapper>
      <Heading id={headingId}>{t("Or start with")}</Heading>
      <Grid role="group" aria-labelledby={headingId}>
        {collectionTemplates.map((template) => (
          <Tile
            key={template.id}
            type="button"
            data-testid="collection-template-starter"
            onClick={() => onSelectTemplate(template)}
          >
            <TileIcon>
              <VoTemplateIcon />
            </TileIcon>
            <span>
              {TextHelper.replaceTemplateVariables(template.displayTitle, user)}
              <Detail>
                {t("{{ collectionName }} template", {
                  collectionName: collection?.name ?? "",
                })}
              </Detail>
            </span>
          </Tile>
        ))}
        <Tile type="button" onClick={handleInsertStructure}>
          <TileIcon>
            <VoDocumentIcon />
          </TileIcon>
          <span>
            {t("Structure with sections")}
            <Detail>{t("Summary, context, steps and references")}</Detail>
          </span>
        </Tile>
        {canImport && (
          <Tile type="button" onClick={handleImport}>
            <TileIcon>
              <ImportIcon />
            </TileIcon>
            <span>
              {t("Import a file")}
              <Detail>{t("Markdown, Word or HTML")}</Detail>
            </span>
          </Tile>
        )}
      </Grid>
      <AllTemplates to={settingsPath("templates")}>
        {t("See all templates")}
      </AllTemplates>
    </Wrapper>
  );
});

const Wrapper = styled.div`
  margin-top: 24px;
`;

const Heading = styled.div`
  font-size: 13px;
  color: ${s("textTertiary")};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  margin-top: 10px;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(2, minmax(0, 1fr));
  `}
`;

const Tile = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 12px 14px;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  background: none;
  text-align: left;
  color: ${s("text")};
  cursor: var(--pointer);

  &:hover {
    background: ${s("listItemHoverBackground")};
    border-color: ${s("inputBorder")};
  }
`;

const TileIcon = styled.span`
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: ${s("listItemHoverBackground")};
  color: ${s("textSecondary")};
`;

const Detail = styled.span`
  display: block;
  font-size: 13px;
  line-height: 18px;
  color: ${s("textTertiary")};
`;

const AllTemplates = styled(Link)`
  display: inline-block;
  margin-top: 14px;
  font-size: 13px;
  color: ${s("link")};
`;
