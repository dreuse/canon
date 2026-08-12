import { observer } from "mobx-react";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  useParams,
  useHistory,
  useRouteMatch,
  useLocation,
} from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { toError } from "@shared/utils/error";
import { hairline, s } from "@shared/styles";
import CenteredContent from "~/components/CenteredContent";
import { CollectionBreadcrumb } from "~/components/CollectionBreadcrumb";
import Heading from "~/components/Heading";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import InputSearchPage from "~/components/InputSearchPage";
import PlaceholderList from "~/components/List/Placeholder";
import PinnedDocuments from "~/components/PinnedDocuments";
import PlaceholderText from "~/components/PlaceholderText";
import Scene, { SceneMeasure } from "~/components/Scene";
import { editCollection } from "~/actions/definitions/collections";
import useCommandBarActions from "~/hooks/useCommandBarActions";
import { useTrackLastVisitedPath } from "~/hooks/useLastVisitedPath";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useMobile from "~/hooks/useMobile";
import { usePinnedDocuments } from "~/hooks/usePinnedDocuments";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { NotFoundError } from "~/utils/errors";
import {
  matchCollectionEdit,
  updateCollectionPath,
} from "~/utils/routeHelpers";
import Error404 from "../Errors/Error404";
import Actions from "./components/Actions";
import DropToImport from "./components/DropToImport";
import MembershipPreview from "./components/MembershipPreview";
import Navigation, { CollectionOrder } from "./components/Navigation";
import Notices from "./components/Notices";
import Overview from "./components/Overview";
import { Header } from "./components/Header";
import usePersistedState from "~/hooks/usePersistedState";
import useCurrentUser from "~/hooks/useCurrentUser";

const CollectionScene = observer(function CollectionScene_() {
  const params = useParams<{ collectionSlug?: string }>();
  const history = useHistory();
  const match = useRouteMatch();
  const location = useLocation();
  const { t } = useTranslation();
  const user = useCurrentUser();
  const { documents, collections, shares, ui } = useStores();
  const [error, setError] = useState<Error | undefined>();
  const currentPath = location.pathname;
  useTrackLastVisitedPath(currentPath);
  const sidebarContext = useLocationSidebarContext();
  const isEditRoute = match.path === matchCollectionEdit;
  const isMobile = useMobile();

  const id = params.collectionSlug || "";
  const urlId = id.split("-").pop() ?? "";

  const collection = collections.get(id);
  const can = usePolicy(collection);

  const { pins, count } = usePinnedDocuments(urlId, collection?.id);

  const [order, setOrder] = usePersistedState<CollectionOrder>(
    `collection-order:${collection?.id}`,
    CollectionOrder.Structure,
    {
      listen: false,
    }
  );

  const handleShowOldest = useCallback(
    () => setOrder(CollectionOrder.Old),
    [setOrder]
  );

  useEffect(() => {
    if (collection?.name) {
      const canonicalUrl = updateCollectionPath(match.url, collection);

      if (match.url !== canonicalUrl) {
        history.replace(canonicalUrl, history.location.state);
      }
    }
  }, [collection, collection?.name, history, id, match.url]);

  useEffect(() => {
    if (collection) {
      ui.setActiveCollection(collection.id);
    }

    return () => ui.setActiveCollection(undefined);
  }, [ui, collection]);

  useEffect(() => {
    async function fetchData() {
      try {
        setError(undefined);
        await collections.fetch(id);
      } catch (err) {
        setError(toError(err));
      }
    }

    void fetchData();
    // Fetched once on mount, the slug in `id` also changes when the collection
    // is renamed which must not trigger a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void collection?.fetchDocuments();
  }, [collection]);

  useEffect(() => {
    if (collection) {
      shares.fetchOne({ collectionId: collection.id }).catch((err) => {
        if (!(err instanceof NotFoundError)) {
          throw err;
        }
      });
    }
  }, [shares, collection]);

  useCommandBarActions([editCollection], [ui.activeCollectionId ?? "none"]);

  if (!collection && error) {
    return <Error404 />;
  }
  if (!collection) {
    return <Loading />;
  }

  const headerSearch = isMobile ? undefined : (
    <InputSearchPage
      source="collection"
      placeholder={`${t("Search in collection")}…`}
      label={t("Search in collection")}
      collectionId={collection.id}
    />
  );

  return (
    <Scene
      centered={false}
      textTitle={collection.name}
      left={
        collection.isArchived ? (
          <CollectionBreadcrumb collection={collection} />
        ) : (
          headerSearch
        )
      }
      title={
        <>
          <CollectionIcon collection={collection} expanded />
          &nbsp;{collection.name}
        </>
      }
      actions={
        <>
          <MembershipPreview collection={collection} />
          <Actions
            collection={collection}
            isEditing={isEditRoute}
            sidebarContext={sidebarContext}
          />
        </>
      }
    >
      <DropToImport
        accept={documents.importFileTypesString}
        disabled={!can.createDocument}
        collectionId={collection.id}
      >
        <CenteredContent withStickyHeader maxWidth={SceneMeasure.index}>
          <Notices collection={collection} />
          <HeaderRow>
            <Header
              collection={collection}
              isEditing={isEditRoute || !user?.separateEditMode}
            />
            <Navigation
              collection={collection}
              order={order}
              onChangeOrder={setOrder}
            />
          </HeaderRow>

          <PinnedDocuments pins={pins} placeholderCount={count} />

          <Content>
            <Overview
              collection={collection}
              order={order}
              showStatus
              onShowOldest={handleShowOldest}
              readOnly={
                !can.update || (!isEditRoute && !!user?.separateEditMode)
              }
            />
          </Content>
        </CenteredContent>
      </DropToImport>
    </Scene>
  );
});

const Loading = () => (
  <CenteredContent>
    <Heading>
      <PlaceholderText height={35} />
    </Heading>
    <PlaceholderList count={5} />
  </CenteredContent>
);

const KeyedCollection = () => {
  const params = useParams<{ collectionSlug?: string }>();

  // Forced mount prevents animation of pinned documents when navigating
  // _between_ collections, speeds up perceived performance.
  return <CollectionScene key={params.collectionSlug?.split("-").pop()} />;
};

const HeaderRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding-bottom: 8px;
  margin: 28px 0 16px;
  border-bottom: 1px solid ${hairline};

  ${breakpoint("tablet")`
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  `}
`;

const Content = styled.div`
  position: relative;
  background: ${s("background")};
`;

export default KeyedCollection;
