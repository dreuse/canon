import { observer } from "mobx-react";
import { TrashIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import Empty from "~/components/Empty";
import { PageHeader } from "~/components/PageHeader";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import Scene from "~/components/Scene";
import useStores from "~/hooks/useStores";
import TrashMenu from "~/menus/TrashMenu";

function Trash() {
  const { t } = useTranslation();
  const { documents } = useStores();

  return (
    <Scene measure="index" icon={<TrashIcon />} title={t("Trash")}>
      <PageHeader
        title={t("Trash")}
        caption={t("Recently deleted documents, which can be restored")}
        actions={<TrashMenu />}
      />
      <PaginatedDocumentList
        documents={documents.deleted}
        fetch={documents.fetchDeleted}
        empty={<Empty>{t("Trash is empty at the moment.")}</Empty>}
        showCollection
        showPath
        showTemplate
      />
    </Scene>
  );
}

export default observer(Trash);
