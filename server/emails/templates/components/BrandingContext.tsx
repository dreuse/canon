import { createContext, useContext } from "react";
import type { EmailBranding } from "@server/emails/branding";
import { defaultBranding } from "@server/emails/branding";

export const BrandingContext = createContext<EmailBranding>(defaultBranding);

export function useBranding() {
  return useContext(BrandingContext);
}
