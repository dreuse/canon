import {
  CollectionIcon as CollectionIconComponent,
  HomeIcon,
  PrivateCollectionIcon,
} from "outline-icons";
import { observer } from "mobx-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { toError } from "@shared/utils/error";
import Icon from "@shared/components/Icon";
import { useSurface } from "@shared/components/SurfaceContext";
import { colorPalette } from "@shared/constants";
import { resolveIconColor } from "@shared/utils/iconColor";
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import useStores from "~/hooks/useStores";

function OptionCollectionIcon({
  color,
  isPrivate,
}: {
  color: string;
  isPrivate: boolean;
}) {
  const surface = useSurface();
  const Component = isPrivate ? PrivateCollectionIcon : CollectionIconComponent;

  return <Component color={resolveIconColor(color, surface)} />;
}

type DefaultCollectionInputSelectProps = {
  onSelectCollection: (collection: string) => void;
  defaultCollectionId: string | null;
  /** Accessible label for the select, hidden visually. */
  label?: string;
  /** The option offered ahead of the collections, defaults to Home. */
  leadingOption?: { label: string; value: string; icon: React.ReactElement };
};

const DefaultCollectionInputSelect = observer(
  ({
    onSelectCollection,
    defaultCollectionId,
    label,
    leadingOption,
  }: DefaultCollectionInputSelectProps) => {
    const { t } = useTranslation();
    const { collections } = useStores();
    const [fetching, setFetching] = useState(false);
    const [fetchError, setFetchError] = useState<Error>();

    React.useEffect(() => {
      async function fetchData() {
        if (!collections.isLoaded && !fetching && !fetchError) {
          try {
            setFetching(true);
            await collections.fetchPage({
              limit: 100,
            });
          } catch (error) {
            toast.error(
              t("Collections could not be loaded, please reload the app")
            );
            setFetchError(toError(error));
          } finally {
            setFetching(false);
          }
        }
      }
      void fetchData();
    }, [fetchError, t, fetching, collections]);

    if (fetching) {
      return null;
    }

    const firstOption = leadingOption ?? {
      label: t("Home"),
      value: "home",
      icon: <HomeIcon />,
    };

    // Eagerly resolve collection icon properties within this observer context
    // to avoid MobX warnings when Radix Select clones elements for the trigger.
    const options: Option[] = collections.nonPrivate.reduce(
      (acc, collection) => {
        const collectionIcon = collection.icon;
        const rawColor = collection.color ?? colorPalette[0];

        let icon: React.ReactElement;
        if (!collectionIcon || collectionIcon === "collection") {
          icon = (
            <OptionCollectionIcon
              color={rawColor}
              isPrivate={collection.isPrivate}
            />
          );
        } else {
          icon = (
            <Icon
              value={collectionIcon}
              color={rawColor}
              initial={collection.initial}
            />
          );
        }

        return [
          ...acc,
          {
            type: "item" as const,
            label: collection.name,
            value: collection.id,
            icon,
          },
        ];
      },
      [
        {
          type: "item",
          label: firstOption.label,
          value: firstOption.value,
          icon: firstOption.icon,
        },
      ] satisfies Option[]
    );

    const selectedValue = defaultCollectionId ?? firstOption.value;

    return (
      <InputSelect
        options={options}
        value={selectedValue}
        onChange={onSelectCollection}
        label={label ?? t("Start view")}
        labelHidden
        short
      />
    );
  }
);

export default DefaultCollectionInputSelect;
