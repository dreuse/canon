import { Table, TBody, TR, TD } from "oy-vey";
import * as React from "react";
import env from "@server/env";
import { useBranding } from "./BrandingContext";
import EmptySpace from "./EmptySpace";

const url = env.CDN_URL ?? env.URL;

export default () => {
  const branding = useBranding();

  return (
    <Table width="100%">
      <TBody>
        <TR>
          <TD>
            <EmptySpace height={40} />
            <img
              alt={env.APP_NAME}
              src={
                branding.logoUrl ??
                (env.isCloudHosted
                  ? `${url}/email/header-logo.png`
                  : "cid:header-image")
              }
              height="48"
              width="48"
            />
          </TD>
        </TR>
      </TBody>
    </Table>
  );
};
