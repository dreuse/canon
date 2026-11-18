import { HomeIcon, SearchIcon } from "outline-icons";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { DELETED_DOCUMENT_RETENTION_DAYS } from "@shared/constants";
import { s } from "@shared/styles";
import { metaDisplay } from "@shared/utils/keyboard";
import Button from "~/components/Button";
import Scene from "~/components/Scene";
import { HStack } from "~/components/primitives/HStack";
import useCurrentUser from "~/hooks/useCurrentUser";
import { homePath, searchPath, trashPath } from "~/utils/routeHelpers";

const Error404 = () => {
  const { t } = useTranslation();
  const user = useCurrentUser({ rejectOnEmpty: false });

  return (
    <Scene title={t("Not found")}>
      <Container>
        <Eyebrow>{t("Error 404")}</Eyebrow>
        <Title>{t("We couldn’t find this page")}</Title>
        <Lead>
          {t(
            "The document may have been moved or deleted, or you may not have access to it."
          )}
        </Lead>
        {user && (
          <>
            <HStack>
              <Button as={Link} to={homePath()} icon={<HomeIcon />}>
                {t("Go to home")}
              </Button>
              <Button as={Link} to={searchPath()} icon={<SearchIcon />} neutral>
                {t("Search documents")}
                <Shortcut>{metaDisplay}K</Shortcut>
              </Button>
            </HStack>
            <Hint>
              <Trans
                defaults="Deleted less than {{ days }} days ago? It’s still in <trash>Trash</trash>. Got a link from someone? Ask them for access."
                values={{ days: DELETED_DOCUMENT_RETENTION_DAYS }}
                components={{ trash: <Link to={trashPath()} /> }}
              />
            </Hint>
          </>
        )}
      </Container>
    </Scene>
  );
};

const Container = styled.div`
  max-width: 520px;
  margin: 0 auto;
  padding: 120px 24px 0;
`;

const Eyebrow = styled.p`
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${s("textTertiary")};
`;

const Title = styled.h1`
  margin: 8px 0 0;
  font-size: 28px;
  line-height: 36px;
`;

const Lead = styled.p`
  margin: 8px 0 24px;
  font-size: 16px;
  line-height: 24px;
  color: ${s("textSecondary")};
`;

const Hint = styled.p`
  margin: 32px 0 0;
  font-size: 13px;
  line-height: 19px;
  color: ${s("textTertiary")};

  a {
    color: ${s("accent")};
  }
`;

const Shortcut = styled.kbd`
  margin-inline-start: 8px;
  padding: 1px 5px;
  border: 1px solid ${s("divider")};
  border-radius: 4px;
  font-family: inherit;
  font-size: 11px;
  color: ${s("textTertiary")};
`;

export default Error404;
