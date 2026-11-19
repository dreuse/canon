import { observer } from "mobx-react";
import { DocumentIcon, PlusIcon } from "outline-icons";
import { type MouseEvent, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { PersonalCollectionId } from "@shared/constants";
import { UserPreference } from "@shared/types";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { DocumentValidation } from "@shared/validations";
import { createAction } from "~/actions";
import { sortCollection } from "~/actions/definitions/collections";
import { DocumentSection } from "~/actions/sections";
import EditableTitle, { type RefHandle } from "~/components/EditableTitle";
import Flex from "~/components/Flex";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { ActionContextProvider } from "~/hooks/useActionContext";
import useBoolean from "~/hooks/useBoolean";
import usePersistedState from "~/hooks/usePersistedState";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useMenuAction } from "~/hooks/useMenuAction";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { useSyncSidebarContext } from "~/hooks/useSyncSidebarContext";
import { documentEditPath } from "~/utils/routeHelpers";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import { VoCollectionIcon } from "~/components/Icons/VobysIcons";
import { PrivateLock, ROW_ICON_SIZE } from "./CollectionRow";
import CollectionLinkChildren from "./CollectionLinkChildren";
import { getHeaderExpandedKey } from "./Header";
import Relative from "./Relative";
import SidebarAction from "./SidebarAction";
import SidebarContext, { type SidebarContextType } from "./SidebarContext";
import SidebarLink, { childDepthFor } from "./SidebarLink";

const PERSONAL_EXPANDED_ID = "personal";
const PERSONAL_CHILD_DEPTH = childDepthFor(0);

/**
 * The sidebar section that shows the documents in the personal collection of
 * the current user.
 */
export const PersonalDocs = observer(function PersonalDocs() {
  const { collections, documents } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const user = useCurrentUser();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const collection = collections.personal;
  const canCollection = usePolicy(collection);
  const canCreate = collection
    ? !!canCollection.createDocument
    : !!can.createPersonalCollection;
  const [isAddingNew, setIsAddingNew, closeAddingNew] = useBoolean();
  const [expanded, setExpanded] = usePersistedState<boolean>(
    getHeaderExpandedKey(PERSONAL_EXPANDED_ID),
    false
  );
  const newTitleRef = useRef<RefHandle>(null);

  // Opens a temporary row with an editable title, the document is only
  // created once a title is submitted.
  const newDocAction = useMemo(
    () =>
      createAction({
        name: ({ t, isMenu }) => (isMenu ? t("New document") : t("New doc")),
        analyticsName: "New personal document",
        section: DocumentSection,
        icon: <PlusIcon />,
        keywords: "create personal private",
        visible: canCreate,
        perform: setIsAddingNew,
      }),
    [canCreate, setIsAddingNew]
  );
  const hasCollection = !!collection;
  const menuActions = useMemo(
    () => (hasCollection ? [newDocAction, sortCollection] : [newDocAction]),
    [hasCollection, newDocAction]
  );
  const menuAction = useMenuAction(menuActions);
  const activeModels = useMemo(
    () => (collection ? [collection] : undefined),
    [collection]
  );

  const handleNewDoc = useCallback(
    async (title: string) => {
      // The personal collection is created with the first document.
      const newDocument = await documents.create(
        {
          collectionId: collection?.id ?? PersonalCollectionId,
          title,
          fullWidth: user.getPreference(UserPreference.FullWidthDocuments),
          data: ProsemirrorDataHelper.getEmpty(),
        },
        { publish: true }
      );
      if (newDocument.collectionId) {
        const personal =
          collection ?? (await collections.fetch(newDocument.collectionId));
        personal.addDocument(newDocument);
      }
      history.push({
        pathname: documentEditPath(newDocument),
        state: { sidebarContext: "personal" },
      });
    },
    [collection, collections, documents, user, history]
  );

  const handleNewDocSubmit = useCallback(
    async (value: string) => {
      try {
        newTitleRef.current?.setIsEditing(false);
        await handleNewDoc(value);
        closeAddingNew();
      } catch (_err) {
        newTitleRef.current?.setIsEditing(true);
      }
    },
    [handleNewDoc, closeAddingNew]
  );

  const collectionId = collection?.id;
  useSyncSidebarContext(
    useCallback(
      (context: NonNullable<SidebarContextType>) => context === "personal",
      []
    ),
    useCallback(
      (activeDocumentId: string) =>
        collectionId &&
        documents.get(activeDocumentId)?.collectionId === collectionId
          ? "personal"
          : undefined,
      [documents, collectionId]
    )
  );

  const handleToggle = useCallback(
    (ev?: MouseEvent<HTMLElement>) => {
      ev?.preventDefault();
      setExpanded(!expanded);
    },
    [expanded, setExpanded]
  );

  if (!collection && !canCreate) {
    return null;
  }

  const newDocRow =
    isAddingNew && canCreate ? (
      <SidebarLink
        isActive={() => true}
        depth={PERSONAL_CHILD_DEPTH}
        icon={<DocumentIcon />}
        ellipsis={false}
        label={
          <EditableTitle
            title=""
            canUpdate
            isEditing
            placeholder={`${t("New doc")}…`}
            onCancel={closeAddingNew}
            onSubmit={handleNewDocSubmit}
            maxLength={DocumentValidation.maxTitleLength}
            ref={newTitleRef}
          />
        }
      />
    ) : null;

  return (
    <SidebarContext.Provider value="personal">
      <ActionContextProvider value={{ activeModels }}>
        <Flex column>
          <SidebarLink
            onClick={handleToggle}
            menu={
              <DropdownMenu
                action={menuAction}
                align="end"
                ariaLabel={t("Section options")}
              >
                <OverflowMenuButton />
              </DropdownMenu>
            }
            onDisclosureClick={handleToggle}
            expanded={expanded}
            icon={
              collection ? (
                <CollectionIcon collection={collection} size={ROW_ICON_SIZE} />
              ) : (
                <VoCollectionIcon size={ROW_ICON_SIZE} />
              )
            }
            compactIcon
            trailing={<PrivateLock />}
            label={t("Personal")}
            depth={0}
          />
          {expanded && (
            <Relative>
              {collection ? (
                <CollectionLinkChildren
                  collection={collection}
                  expanded
                  prefetchDocument={documents.prefetchDocument}
                >
                  {newDocRow}
                </CollectionLinkChildren>
              ) : (
                newDocRow
              )}
              <SidebarAction
                action={newDocAction}
                depth={PERSONAL_CHILD_DEPTH}
              />
            </Relative>
          )}
        </Flex>
      </ActionContextProvider>
    </SidebarContext.Provider>
  );
});
