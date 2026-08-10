import { orderBy } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { NewDocumentIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router-dom";
import { Pagination } from "@shared/constants";
import { FileOperationType } from "@shared/types";
import { cdnPath } from "@shared/utils/urls";
import type FileOperation from "~/models/FileOperation";
import ImportModel from "~/models/Import";
import Button from "~/components/Button";
import MarkdownIcon from "~/components/Icons/MarkdownIcon";
import CanonIcon from "~/components/Icons/CanonIcon";
import Item from "~/components/List/Item";
import PaginatedList from "~/components/PaginatedList";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import env from "~/env";
import useStores from "~/hooks/useStores";
import { Hook, PluginManager } from "~/utils/PluginManager";
import { settingsPath } from "~/utils/routeHelpers";
import FileOperationListItem from "./components/FileOperationListItem";
import ImportJSONDialog from "./components/ImportJSONDialog";
import { ImportListItem } from "./components/ImportListItem";
import ImportMarkdownDialog from "./components/ImportMarkdownDialog";

type Config = {
  /** The title of the import. */
  title: string;
  /** The auxiliary descriptive text of the import. */
  subtitle: string;
  /** An icon to denote the kind of import. */
  icon: React.ReactElement;
  /** Trigger for the import. */
  action: React.ReactElement;
};

import { SettingGroup } from "./components/SettingGroup";

import { SettingsTitle } from "./components/SettingsTitle";
function useImportsConfig() {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const appName = env.APP_NAME;

  return React.useMemo(() => {
    const items: Config[] = [
      {
        title: t("Markdown"),
        subtitle: t(
          "Import a zip file of Markdown documents (exported from version 0.67.0 or earlier)"
        ),
        icon: <MarkdownIcon size={28} />,
        action: (
          <Button
            type="submit"
            onClick={() => {
              dialogs.openModal({
                title: t("Import data"),
                content: <ImportMarkdownDialog />,
              });
            }}
            neutral
          >
            {t("Import")}…
          </Button>
        ),
      },
      {
        title: "JSON",
        subtitle: t(
          "Import a JSON data file exported from another {{ appName }} instance",
          {
            appName,
          }
        ),
        icon: <CanonIcon size={28} cover />,
        action: (
          <Button
            type="submit"
            onClick={() => {
              dialogs.openModal({
                title: t("Import data"),
                content: <ImportJSONDialog />,
              });
            }}
            neutral
          >
            {t("Import")}…
          </Button>
        ),
      },
    ];

    PluginManager.getHooks(Hook.Imports).forEach((plugin) => {
      items.push({ ...plugin.value });
    });

    items.push({
      title: "Confluence",
      subtitle: t("Import pages from a Confluence instance"),
      icon: <img src={cdnPath("/images/confluence.png")} alt="" width={28} />,
      action: (
        <Button type="submit" disabled neutral>
          {t("Enterprise")}
        </Button>
      ),
    });

    return items;
  }, [t, dialogs, appName]);
}

function Import() {
  const { t } = useTranslation();
  const { fileOperations, imports } = useStores();
  const configs = useImportsConfig();
  const appName = env.APP_NAME;

  const [, setForceRender] = React.useState(0);
  const offset = React.useMemo(() => ({ imports: 0, fileOperations: 0 }), []);

  const fetchImports = React.useCallback(async () => {
    const [importsArr, fileOpsArr] = await Promise.all([
      imports.fetchPage({
        offset: offset.imports,
        limit: Pagination.defaultLimit,
      }),
      fileOperations.fetchPage({
        type: FileOperationType.Import,
        offset: offset.fileOperations,
        limit: Pagination.defaultLimit,
      }),
    ]);

    const pageImports = orderBy(
      [...importsArr, ...fileOpsArr],
      "createdAt",
      "desc"
    ).slice(0, Pagination.defaultLimit);

    const apiImportsCount = pageImports.filter(
      (item) => item instanceof ImportModel
    ).length;

    offset.imports += apiImportsCount;
    offset.fileOperations += pageImports.length - apiImportsCount;

    // needed to re-render after mobx store and offset is updated
    setForceRender((s) => ++s);

    return pageImports;
  }, [imports, fileOperations, offset]);

  const allImports = orderBy(
    [
      ...imports.orderedData,
      ...fileOperations.filter({ type: FileOperationType.Import }),
    ],
    "createdAt",
    "desc"
  ).slice(0, offset.imports + offset.fileOperations);

  return (
    <Scene title={t("Import & export")} icon={<NewDocumentIcon />}>
      <SettingsTitle title={t("Import & export")}>
        <Trans>
          Quickly transfer your existing documents, pages, and files from other
          tools and services into {{ appName }}. You can also drag and drop any
          HTML, Markdown, and text documents directly into Collections in the
          app.
        </Trans>
      </SettingsTitle>
      <Text as="p" type="secondary">
        <Link to={settingsPath("export")}>{t("Export the workspace")}</Link>
      </Text>

      <div>
        {configs.map((config) => (
          <Item
            key={config.title}
            title={config.title}
            subtitle={config.subtitle}
            image={config.icon}
            actions={config.action}
            border={false}
          />
        ))}
      </div>
      <br />
      <PaginatedList<ImportModel | FileOperation>
        items={allImports}
        fetch={fetchImports}
        heading={
          <SettingGroup>
            <Trans>Recent imports</Trans>
          </SettingGroup>
        }
        renderItem={(item) =>
          item instanceof ImportModel ? (
            <ImportListItem key={item.id} importModel={item} />
          ) : (
            <FileOperationListItem key={item.id} fileOperation={item} />
          )
        }
      />
    </Scene>
  );
}

export default observer(Import);
