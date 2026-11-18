import { PersonalCollectionId } from "@shared/constants";
import { actionToMenuItem } from "~/actions";
import { importDocument } from "~/actions/definitions/documents";
import useActionContext from "~/hooks/useActionContext";
import usePolicy from "~/hooks/usePolicy";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";

/**
 * Resolves the import action into the personal collection, and whether the
 * current user may use it.
 *
 * @returns the import menu item and whether importing is allowed.
 */
export function useHomeImportAction() {
  const { collections } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const personalCollection = collections.personal;
  const canPersonal = usePolicy(personalCollection);
  const context = useActionContext({ isMenu: false, isCommandBar: false });

  const importItem = actionToMenuItem(importDocument, {
    ...context,
    activeCollectionId: personalCollection?.id ?? PersonalCollectionId,
  });
  const canImport = personalCollection
    ? !!canPersonal.createDocument
    : !!can.createPersonalCollection;

  return { importItem, canImport };
}
