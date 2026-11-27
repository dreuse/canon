import { first } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { Suspense, useCallback, useState } from "react";
import type * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { colorPalette } from "@shared/constants";
import { errToString } from "@shared/utils/error";
import { DocumentValidation } from "@shared/validations";
import type Document from "~/models/Document";
import Button from "~/components/Button";
import Input from "~/components/Input";
import { createLazyComponent } from "~/components/LazyLoad";
import useStores from "~/hooks/useStores";
import { HStack } from "./primitives/HStack";

const IconPicker = createLazyComponent(() => import("~/components/IconPicker"));

type Props = {
  /** The document whose name and icon are edited. */
  document: Document;
  /** Callback fired after the changes are saved. */
  onSubmit: () => void;
};

/**
 * A form to edit the name and icon of a document, as shown in the sidebar.
 *
 * @param props the component props.
 * @returns the form element.
 */
export const DocumentEdit = observer(function DocumentEdit_({
  document,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const [title, setTitle] = useState(document.title);
  const [icon, setIcon] = useState(document.icon ?? null);
  const [color, setColor] = useState(document.color ?? null);
  const [isSaving, setIsSaving] = useState(false);

  const handleTitleChange = useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => setTitle(ev.target.value),
    []
  );

  const handleIconChange = useCallback(
    (nextIcon: string | null, nextColor: string | null) => {
      setIcon(nextIcon);
      setColor(nextColor);
    },
    []
  );

  const handleSubmit = useCallback(
    async (ev: React.FormEvent) => {
      ev.preventDefault();
      setIsSaving(true);
      try {
        await documents.update({ id: document.id, title, icon, color });
        onSubmit();
      } catch (err) {
        toast.error(errToString(err));
      } finally {
        setIsSaving(false);
      }
    },
    [documents, document.id, title, icon, color, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="text"
        label={t("Name")}
        value={title}
        onChange={handleTitleChange}
        maxLength={DocumentValidation.maxTitleLength}
        prefix={
          <Suspense fallback={null}>
            <IconPicker.Component
              icon={icon}
              color={color ?? (first(colorPalette) as string)}
              initial={title.charAt(0).toUpperCase()}
              popoverPosition="right"
              onChange={handleIconChange}
              allowDelete
            />
          </Suspense>
        }
        autoComplete="off"
        autoFocus
        required
        flex
      />
      <HStack justify="flex-end">
        <Button type="submit" disabled={isSaving || !title.trim()}>
          {isSaving ? `${t("Saving")}…` : t("Save")}
        </Button>
      </HStack>
    </form>
  );
});
