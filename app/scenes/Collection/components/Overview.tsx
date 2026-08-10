import { debounce } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { useMemo, useRef, useCallback, useEffect, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { richExtensions } from "@shared/editor/nodes";
import { s } from "@shared/styles";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { CollectionValidation } from "@shared/validations";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import Editor from "~/components/Editor";
import LoadingIndicator from "~/components/LoadingIndicator";
import Text from "~/components/Text";
import { MeasuredContainer } from "~/components/MeasuredContainer";
import { withUIExtensions } from "~/editor/extensions";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import type { Properties } from "~/types";
import CodeWordBreak from "@shared/editor/extensions/CodeWordBreak";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { Activity } from "./Activity";
import { Index } from "./Index";
import { type CollectionOrder } from "./Navigation";
import { StatusRail } from "./StatusRail";

const extensions = [CodeWordBreak, ...withUIExtensions(richExtensions)];

type Props = {
  collection: Collection;
  order: CollectionOrder;
  showStatus?: boolean;
  onShowOldest?: () => void;
  readOnly?: boolean;
};

function Overview({
  collection,
  order,
  showStatus,
  onShowOldest,
  readOnly,
}: Props) {
  const { documents, collections } = useStores();
  const { t } = useTranslation();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const can = usePolicy(collection);

  const handleSave = useMemo(
    () =>
      debounce(async (getValue) => {
        try {
          await collection.save({
            data: getValue(false),
          });
        } catch (err) {
          toast.error(t("Sorry, an error occurred saving the collection"));
          throw err;
        }
      }, 1000),
    [collection, t]
  );

  useEffect(
    () => () => {
      void handleSave.flush();
    },
    [handleSave]
  );

  const childRef = useRef<HTMLDivElement>(null);
  const editorStyle = useMemo(
    () => ({
      padding: "0 32px",
      margin: "0 -32px",
    }),
    []
  );

  const onCreateLink = useCallback(
    async (params: Properties<Document>) => {
      const newDocument = await documents.create(
        {
          collectionId: collection.id,
          data: ProsemirrorDataHelper.getEmpty(),
          ...params,
        },
        {
          publish: true,
        }
      );

      return newDocument.url;
    },
    [collection, documents]
  );

  return (
    <Columns>
      {collections.isSaving && <LoadingIndicator />}
      <Main>
        <Prose>
          <Suspense fallback={<Placeholder>Loading…</Placeholder>}>
            <MeasuredContainer name="document">
              <Editor
                defaultValue={collection.data}
                onChange={handleSave}
                placeholder={`${t("Add a description")}…`}
                extensions={extensions}
                maxLength={CollectionValidation.maxDescriptionLength}
                onCreateLink={onCreateLink}
                canUpdate={can.update}
                readOnly={!can.update || readOnly}
                userId={user?.id}
                editorStyle={editorStyle}
              />
              <div ref={childRef} />
            </MeasuredContainer>
          </Suspense>
        </Prose>
        <Index collection={collection} order={order} />
        {showStatus && <Activity collection={collection} />}
      </Main>
      {showStatus && (
        <Rail>
          <StatusRail collection={collection} onShowOldest={onShowOldest} />
        </Rail>
      )}
    </Columns>
  );
}

const Columns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 32px;
  align-items: start;
  padding-bottom: 30vh;

  ${breakpoint("tablet")`
    grid-template-columns: minmax(0, 1fr) 232px;
  `};
`;

const Main = styled.div`
  min-width: 0;
`;

const Prose = styled.div`
  max-width: ${EditorStyleHelper.documentWidth};
`;

const Rail = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Placeholder = styled(Text)`
  color: ${s("placeholder")};
  cursor: text;
  min-height: 27px;
`;

export default observer(Overview);
