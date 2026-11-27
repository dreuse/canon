import { observer } from "mobx-react";
import {
  TableOfContentsIcon,
  EditIcon,
  CommentIcon,
  CheckmarkIcon,
  BackIcon,
} from "outline-icons";
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useHistory } from "react-router-dom";
import useMeasure from "react-use-measure";
import styled, { useTheme } from "styled-components";
import DotIcon from "@shared/components/DotIcon";
import { HEADER_HEIGHT } from "@shared/constants";
import { s } from "@shared/styles";
import { altDisplay, metaDisplay } from "@shared/utils/keyboard";
import { publishDocument } from "~/actions/definitions/documents";
import { restoreRevision } from "~/actions/definitions/revisions";
import { Action } from "~/components/Actions";
import Badge from "~/components/Badge";
import Button from "~/components/Button";
import Collaborators from "~/components/Collaborators";
import DocumentBreadcrumb from "~/components/DocumentBreadcrumb";
import { useDocumentContext } from "~/components/DocumentContext";
import Flex from "~/components/Flex";
import Header from "~/components/Header";
import { useSplitView } from "~/components/SplitView/context";
import Star from "~/components/Star";
import Tooltip from "~/components/Tooltip";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import useEditingFocus from "~/hooks/useEditingFocus";
import useKeyDown from "~/hooks/useKeyDown";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useBelowDesktop from "~/hooks/useBelowDesktop";
import useMobile from "~/hooks/useMobile";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import TableOfContentsMenu from "~/menus/TableOfContentsMenu";
import TemplatesMenu from "~/menus/TemplatesMenu";
import type Document from "~/models/Document";
import type Revision from "~/models/Revision";
import type Template from "~/models/Template";
import {
  documentEditPath,
  documentPath,
  draftsPath,
  homePath,
} from "~/utils/routeHelpers";
import { ChangesNavigation } from "./ChangesNavigation";
import ObservingBanner from "./ObservingBanner";
import { SearchHighlightChip } from "./SearchHighlightChip";
import { useFontSizeShortcuts } from "./FontSizeControl";
import ShareButton from "./ShareButton";
import { VerifiedBadge } from "./VerifiedBadge";

const SHOW_ALL_BREADCRUMB_LEVELS = Infinity;
const COLLECTION_DOT_SIZE = 24;

type Props = {
  document: Document;
  revision: Revision | undefined;
  isDraft: boolean;
  isEditing: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  publishingIsDisabled: boolean;
  savingIsDisabled: boolean;
  onSelectTemplate: (template: Template) => void;
  onSave: (options: {
    done?: boolean;
    publish?: boolean;
    autosave?: boolean;
  }) => void;
};

function DocumentHeader({
  document,
  revision,
  isEditing,
  isDraft,
  savingIsDisabled,
  publishingIsDisabled,
  onSelectTemplate,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const { ui } = useStores();
  const theme = useTheme();
  const team = useCurrentTeam({ rejectOnEmpty: false });
  const user = useCurrentUser({ rejectOnEmpty: false });
  const isMobileMedia = useMobile();
  const belowDesktop = useBelowDesktop();
  const isRevision = !!revision;
  const isEditingFocus = useEditingFocus();

  // Set CSS variable for header offset (used by sticky table headers)
  useEffect(() => {
    window.document.documentElement.style.setProperty(
      "--header-offset",
      isEditingFocus ? "0px" : `${HEADER_HEIGHT}px`
    );
  }, [isEditingFocus]);

  const { hasHeadings, editor, multiplayerStatus, hasUnsyncedChanges } =
    useDocumentContext();
  const sidebarContext = useLocationSidebarContext();
  const [measureRef, size] = useMeasure();
  const isMobile = isMobileMedia || (size.width > 0 && size.width < 700);
  const isPhone = isMobileMedia;
  const { collection } = document;
  const opensPublishPicker =
    !document.collectionId || (!!collection?.isPersonal && !document.isDraft);
  const backPath = collection
    ? collection.path
    : document.isDraft
      ? draftsPath()
      : homePath();

  // We cache this value for as long as the component is mounted so that if you
  // apply a template there is still the option to replace it until the user
  // navigates away from the doc
  const [wasNew] = useState(document.isPersistedOnce);

  const handleSave = useCallback(() => {
    onSave({
      done: true,
    });
  }, [onSave]);

  const handleToggle = useCallback(() => {
    ui.set({ tocVisible: !ui.tocVisible });
  }, [ui]);

  const can = usePolicy(document);
  const { isDeleted } = document;
  const canToggleEmbeds = team?.documentEmbeds;
  const showContents = ui.tocVisible === true;
  const showSaved =
    multiplayerStatus === "connected" &&
    can.update &&
    !isRevision &&
    !hasUnsyncedChanges;
  const showConversations =
    !!team?.commentingEnabled && can.comment && !isDeleted && !isRevision;

  const toc = (
    <Tooltip
      content={
        showContents
          ? t("Hide contents")
          : hasHeadings
            ? t("Show contents")
            : `${t("Show contents")} (${t("available when headings are added")})`
      }
      shortcut={`Ctrl+${altDisplay}+h`}
      side="bottom"
    >
      <TocButton
        aria-label={t("Show contents")}
        onClick={handleToggle}
        icon={<TableOfContentsIcon />}
        borderOnHover
        neutral
      />
    </Tooltip>
  );
  const editAction = (
    <Action>
      <Tooltip
        content={t("Edit {{noun}}", {
          noun: document.noun,
        })}
        shortcut="e"
        side="bottom"
      >
        <Button
          as={Link}
          icon={<EditIcon />}
          to={{
            pathname: documentEditPath(document),
            state: { sidebarContext },
          }}
          borderOnHover={isMobile}
          neutral
        >
          {isMobile ? null : t("Edit")}
        </Button>
      </Tooltip>
    </Action>
  );

  useFontSizeShortcuts();

  useKeyDown(
    (event) => event.ctrlKey && event.altKey && event.code === "KeyH",
    handleToggle,
    {
      allowInInput: true,
    }
  );

  return (
    <StyledHeader
      ref={measureRef}
      $hidden={isEditingFocus}
      hasSidebar={!isPhone}
      fullLeft
      left={
        isPhone ? (
          <>
            <BackButton
              forwardedAs={Link}
              to={backPath}
              aria-label={
                collection
                  ? t("Back to {{ name }}", { name: collection.displayName })
                  : t("Back")
              }
              icon={<BackIcon />}
              borderOnHover
              neutral
            />
            {collection && (
              <PhoneCollection>
                <DotIcon
                  color={collection.color ?? undefined}
                  size={COLLECTION_DOT_SIZE}
                />
                <PhoneCollectionName>
                  {collection.displayName}
                </PhoneCollectionName>
              </PhoneCollection>
            )}
          </>
        ) : isMobile ? (
          <MobileBreadcrumb>
            <DocumentBreadcrumb document={document} maxDepth={1} onlyText />
          </MobileBreadcrumb>
        ) : (
          <LeftSlot align="center" gap={8}>
            <DocumentBreadcrumb
              document={document}
              showCurrent
              max={SHOW_ALL_BREADCRUMB_LEVELS}
            />
            {!belowDesktop && toc}
            <VerifiedBadge document={document} />
          </LeftSlot>
        )
      }
      title={null}
      actions={({ isCompact }) => (
        <>
          <ObservingBanner />
          <SearchHighlightChip />
          {(isMobile || belowDesktop) && (
            <Action>
              <TableOfContentsMenu />
            </Action>
          )}
          {document.isArchived && (
            <Action>
              <Badge>{t("Archived")}</Badge>
            </Action>
          )}
          {document.isDraft && (
            <Action>
              <Badge>{t("Draft")}</Badge>
            </Action>
          )}
          {showSaved && !isCompact && !isPhone && (
            <SavedStatus>
              <CheckmarkIcon size={16} />
              {t("Saved")}
            </SavedStatus>
          )}
          {!isDeleted && !isRevision && can.listViews && !isPhone && (
            <Collaborators
              document={document}
              limit={isCompact ? 3 : undefined}
            />
          )}
          {showConversations && <ConversationsButton document={document} />}
          {!isMobile && !belowDesktop && (
            <StarAction>
              <Star document={document} color={theme.textSecondary} />
            </StarAction>
          )}
          {(isEditing || !user?.separateEditMode) && wasNew && can.update && (
            <Action>
              <TemplatesMenu
                isCompact={isCompact}
                document={document}
                onSelectTemplate={onSelectTemplate}
              />
            </Action>
          )}
          {!isEditing && !isRevision && !isDraft && can.update && !isPhone && (
            <Action>
              <ShareButton document={document} />
            </Action>
          )}
          {isEditing && (
            <Action>
              <Tooltip
                content={isDraft ? t("Save draft") : t("Done editing")}
                shortcut={`${metaDisplay}+enter`}
                side="bottom"
              >
                <Button
                  onClick={handleSave}
                  disabled={savingIsDisabled}
                  neutral
                  hideIcon
                >
                  {isDraft ? t("Save draft") : t("Done editing")}
                </Button>
              </Tooltip>
            </Action>
          )}
          {can.update &&
            !isEditing &&
            user?.separateEditMode &&
            !isRevision &&
            editAction}
          {revision && (
            <>
              <Action>
                <ChangesNavigation />
              </Action>
              <Action>
                <Tooltip content={t("Restore version")} side="bottom">
                  <Button
                    action={restoreRevision}
                    disabled={revision.createdAt === document.updatedAt}
                    neutral
                    hideOnActionDisabled
                  >
                    {t("Restore")}
                  </Button>
                </Tooltip>
              </Action>
            </>
          )}
          <Action>
            <Button
              action={publishDocument}
              disabled={publishingIsDisabled}
              hideOnActionDisabled
              hideIcon
            >
              {opensPublishPicker ? `${t("Publish")}…` : t("Publish")}
            </Button>
          </Action>
          <Action>
            <DocumentMenu
              document={document}
              align="end"
              ariaLabel={isPhone ? t("More actions") : undefined}
              neutral
              onSelectTemplate={onSelectTemplate}
              onFindAndReplace={editor?.commands.openFindAndReplace}
              showToggleEmbeds={canToggleEmbeds}
              showDisplayOptions
            />
          </Action>
        </>
      )}
    />
  );
}

const ConversationsButton = observer(function ConversationsButton_({
  document,
}: {
  document: Document;
}) {
  const { t } = useTranslation();
  const { comments, ui } = useStores();
  const history = useHistory();
  const { pane } = useSplitView();
  const sidebarContext = useLocationSidebarContext();
  const count = comments.unresolvedThreadsInDocumentCount(document.id);
  const isOpen = ui.getRightSidebar(pane) === "comments";
  const label = count
    ? t("Conversations, {{ count }} open", { count })
    : t("Conversations");

  const handleClick = useCallback(() => {
    const path = documentPath(document);
    if (!history.location.pathname.startsWith(path)) {
      history.push({ pathname: path, state: { sidebarContext } });
    }
    ui.setRightSidebar(isOpen ? null : "comments", pane);
  }, [history, document, sidebarContext, ui, pane, isOpen]);

  return (
    <Action>
      <Tooltip content={t("Conversations")} side="bottom">
        <Button
          aria-label={label}
          aria-expanded={isOpen}
          onClick={handleClick}
          icon={<CommentIcon />}
          borderOnHover
          neutral
        >
          {count || null}
        </Button>
      </Tooltip>
    </Action>
  );
});

const StyledHeader = styled(Header)<{ $hidden: boolean }>`
  margin-inline-end: calc(-1 * var(--comments-margin-width, 0px));
  transition: opacity 500ms ease-in-out;
  ${(props) => props.$hidden && "opacity: 0;"}
`;

const TocButton = styled(Button)`
  border-radius: 4px;

  &&:hover:not(:disabled),
  &&[aria-expanded="true"] {
    background: ${s("buttonNeutralHoverBackground")};
    box-shadow: none;
    transition: none;
  }
`;

const LeftSlot = styled(Flex)`
  min-width: 0;
`;

const SavedStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${s("textTertiary")};
  font-size: 13px;
  white-space: nowrap;
`;

const BackButton = styled(Button)`
  flex-shrink: 0;
`;

const PhoneCollection = styled.span`
  display: inline-flex;
  align-items: center;
  min-width: 0;
  font-size: 16px;
  font-weight: 500;
  color: ${s("text")};
`;

const PhoneCollectionName = styled.span`
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const MobileBreadcrumb = styled.span`
  display: inline-flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 14px;
  color: ${s("textSecondary")};
`;

const StarAction = styled.span`
  display: inline-flex;

  button {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 100ms ease-in-out;

    &:hover {
      background: ${s("buttonNeutralHoverBackground")};
      transition: none;
    }
  }
`;

export default observer(DocumentHeader);
