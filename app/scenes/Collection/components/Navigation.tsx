import { observer } from "mobx-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type Collection from "~/models/Collection";
import FilterOptions from "~/components/FilterOptions";

export enum CollectionOrder {
  Structure = "structure",
  Popular = "popular",
  Updated = "updated",
  Published = "published",
  Old = "old",
  Alphabetical = "alphabetical",
}

type Props = {
  collection: Collection;
  order: CollectionOrder;
  onChangeOrder: (order: CollectionOrder) => void;
};

const Navigation = observer(function Navigation({
  collection,
  order,
  onChangeOrder,
}: Props) {
  const { t } = useTranslation();

  const options = useMemo(
    () => [
      { key: CollectionOrder.Structure, label: t("Collection order") },
      { key: CollectionOrder.Updated, label: t("Recently updated") },
      { key: CollectionOrder.Published, label: t("Recently published") },
      { key: CollectionOrder.Old, label: t("Least recently updated") },
      { key: CollectionOrder.Popular, label: t("Popular") },
      { key: CollectionOrder.Alphabetical, label: t("A–Z") },
    ],
    [t]
  );

  if (collection.isArchived) {
    return null;
  }

  return (
    <FilterOptions
      showFilter={false}
      showIcons={false}
      disclosure={false}
      options={options}
      selectedKeys={[order]}
      onSelect={(key) => onChangeOrder(key as CollectionOrder)}
      defaultLabel={t("Collection order")}
    />
  );
});

export default Navigation;
