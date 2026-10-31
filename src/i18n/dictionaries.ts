import type { Locale } from "./config";
import th from "./dictionaries/th.json";
import en from "./dictionaries/en.json";

export type Dictionary = typeof th;

const dictionaries: Record<Locale, Dictionary> = { th, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
