import { escape } from "es-toolkit/compat";
import env from "@server/env";

/**
 * Returns the OpenSearch description XML document, allowing browsers to
 * register the installation as a search engine.
 *
 * @param baseUrl the base URL of the installation.
 * @returns the OpenSearch description XML.
 */
export const opensearchResponse = (baseUrl: string): string => {
  const name = escape(env.APP_NAME);
  const icon = `${baseUrl}/images/favicon-16.png`;

  return `
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:moz="http://www.mozilla.org/2006/browser/search/">
  <ShortName>${name}</ShortName>
  <Description>Search ${name}</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image width="16" height="16" type="image/x-icon">${icon}</Image>
  <Url type="text/html" method="get" template="${baseUrl}/search/{searchTerms}?ref=opensearch"/>
  <moz:SearchForm>${baseUrl}/search</moz:SearchForm>
</OpenSearchDescription>
`;
};
