import { readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const LOCALES_DIR = path.join(import.meta.dirname, "shared", "i18n", "locales");
const SOURCE_LOCALE = "en_US";
const CATALOG = "translation.json";
const INDENTATION = 2;

const catalogPath = (locale) => path.join(LOCALES_DIR, locale, CATALOG);

const readCatalog = (locale) =>
  JSON.parse(readFileSync(catalogPath(locale), "utf8"));

const source = readCatalog(SOURCE_LOCALE);

const locales = readdirSync(LOCALES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== SOURCE_LOCALE)
  .map((entry) => entry.name);

let total = 0;

for (const locale of locales) {
  const catalog = readCatalog(locale);
  const swept = Object.fromEntries(
    Object.entries(catalog).filter(([key]) => key in source)
  );
  const orphans = Object.keys(catalog).length - Object.keys(swept).length;

  if (orphans === 0) {
    continue;
  }

  writeFileSync(
    catalogPath(locale),
    `${JSON.stringify(swept, null, INDENTATION)}\n`
  );
  console.log(`${locale}: removed ${orphans} orphaned keys`);
  total += orphans;
}

console.log(`Removed ${total} orphaned keys from ${locales.length} locales.`);
