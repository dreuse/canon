import { DocumentIcon, QuestionMarkIcon } from "outline-icons";
import * as React from "react";
import Icon from "@shared/components/Icon";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import useStores from "~/hooks/useStores";
import type Document from "~/models/Document";

interface SidebarItem {
  documentId?: string;
  collectionId?: string;
  groupId?: string;
}

export function useDocumentIcon(document: Document | undefined) {
  const { collections } = useStores();

  if (!document) {
    return null;
  }

  if (document.icon) {
    return (
      <Icon
        value={document.icon}
        initial={document.initial}
        color={document.color ?? undefined}
      />
    );
  }

  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;

  return collection ? (
    <CollectionIcon collection={collection} />
  ) : (
    <DocumentIcon outline={document.isDraft} />
  );
}

export function useSidebarLabelAndIcon({
  documentId,
  collectionId,
  groupId,
}: SidebarItem) {
  const { collections, documents } = useStores();
  const icon = <QuestionMarkIcon />;

  if (documentId) {
    const document = documents.get(documentId);
    if (document) {
      return {
        label: document.titleWithDefault,
        icon: document.icon ? (
          <Icon
            value={document.icon}
            initial={document.initial}
            color={document.color ?? undefined}
          />
        ) : groupId ? null : (
          <DocumentIcon outline={document.isDraft} />
        ),
      };
    }
  }

  if (collectionId) {
    const collection = collections.get(collectionId);
    if (collection) {
      return {
        label: collection.name,
        icon: <CollectionIcon collection={collection} />,
      };
    }
  }

  return {
    label: "",
    icon,
  };
}
