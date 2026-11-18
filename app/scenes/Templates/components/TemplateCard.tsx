import { observer } from "mobx-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { resolve } from "~/actions";
import { createDocumentFromTemplate } from "~/actions/definitions/templates";
import Button from "~/components/Button";
import Time from "~/components/Time";
import useActionContext, {
  ActionContextProvider,
} from "~/hooks/useActionContext";
import useCurrentUser from "~/hooks/useCurrentUser";
import TemplateMenu from "~/menus/TemplateMenu";
import type Template from "~/models/Template";
import history from "~/utils/history";
import { templatePath } from "~/utils/routeHelpers";
import type { LocationDescriptor } from "history";

const PREVIEW_LINE_WIDTHS = ["92%", "70%", "84%"];
const TITLE_LINES = 2;
const TEXT_LINES = 2;

interface Props {
  template: Template;
}

/**
 * Returns the first line of text in a template.
 *
 * @param template the template to read.
 * @returns the text of the first block that has text, or an empty string.
 */
function firstLineOfText(template: Template): string {
  return (
    template.data?.content
      ?.map((node) => ProsemirrorDataHelper.toPlainText(node))
      .find(Boolean) ?? ""
  );
}

function UseButton() {
  const { t } = useTranslation();
  const context = useActionContext();

  if (!resolve<boolean>(createDocumentFromTemplate.visible, context)) {
    return null;
  }

  return (
    <Button
      as={Link}
      to={resolve<LocationDescriptor>(createDocumentFromTemplate.to, context)}
      neutral
    >
      {t("Use")}
    </Button>
  );
}

/**
 * A card for a template on the templates page, with its preview, first line of
 * text, last editor and the actions to use or manage it.
 *
 * @param props the template to show.
 * @returns the template card.
 */
export const TemplateCard = observer(function TemplateCard({
  template,
}: Props) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const editor = template.updatedBy ?? template.createdBy;
  const text = firstLineOfText(template);

  const handleEdit = useCallback(() => {
    history.push(templatePath(template.urlId));
  }, [template.urlId]);

  return (
    <ActionContextProvider value={{ activeModels: [template] }}>
      <Card>
        <Preview aria-hidden="true">
          <PreviewTitle />
          {PREVIEW_LINE_WIDTHS.map((width) => (
            <PreviewLine key={width} style={{ width }} />
          ))}
        </Preview>
        <Title to={templatePath(template.urlId)}>{template.displayTitle}</Title>
        {text && <Text>{text}</Text>}
        <Meta>
          {editor?.id === user.id ? t("You") : editor?.name}
          {" · "}
          <Time dateTime={template.updatedAt} addSuffix />
        </Meta>
        <Footer>
          <UseButton />
          <TemplateMenu template={template} onEdit={handleEdit} />
        </Footer>
      </Card>
    </ActionContextProvider>
  );
});

const Card = styled.article`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 12px;
  background: ${s("background")};
  border: 1px solid ${s("divider")};
  border-radius: 10px;

  &:hover {
    background: ${s("listItemHoverBackground")};
  }
`;

const Preview = styled.span`
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 8px;
  padding: 10px 12px;
  border: 1px solid ${s("divider")};
  border-radius: 6px;
  background: ${s("backgroundSecondary")};
`;

const PreviewLine = styled.i`
  display: block;
  height: 4px;
  border-radius: 2px;
  background: ${s("divider")};
`;

const PreviewTitle = styled(PreviewLine)`
  width: 52%;
  background: ${s("textTertiary")};
`;

const clamp = (lines: number) => `
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${lines};
  overflow: hidden;
  overflow-wrap: anywhere;
`;

const Title = styled(Link)`
  ${clamp(TITLE_LINES)}
  color: ${s("text")};
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;

  &:hover {
    text-decoration: underline;
  }
`;

const Text = styled.span`
  ${clamp(TEXT_LINES)}
  color: ${s("textSecondary")};
  font-size: 13px;
  line-height: 18px;
`;

const Meta = styled.span`
  margin-top: 4px;
  color: ${s("textTertiary")};
  font-size: 12px;
  line-height: 16px;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 4px;
`;
