import { brand } from "@shared/styles/brand";
import env from "@server/env";

const icons = [
  { src: "/images/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "/images/icon-512.png", sizes: "512x512", type: "image/png" },
  {
    src: "/images/icon-maskable-192.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "maskable",
  },
  {
    src: "/images/icon-maskable-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
  {
    src: "/images/icon-maskable-1024.png",
    sizes: "1024x1024",
    type: "image/png",
    purpose: "maskable",
  },
];

const maxShortNameLength = 12;

export const manifestResponse = () => ({
  name: env.APP_NAME,
  short_name: env.APP_NAME.slice(0, maxShortNameLength),
  theme_color: brand.ink,
  background_color: brand.paper,
  start_url: "/",
  scope: "/",
  display: "standalone",
  icons,
});
