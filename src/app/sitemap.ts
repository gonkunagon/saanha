import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { site } from "@/config/site";
import { getArticleSlugs } from "@/lib/kb";

const staticPaths = ["", "/services", "/calculator", "/track", "/kb", "/quote", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const kbPaths = getArticleSlugs("th").map((slug) => `/kb/${slug}`);

  return [...staticPaths, ...kbPaths].map((p) => ({
    url: `${site.url}/th${p}`,
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, `${site.url}/${l}${p}`])),
    },
  }));
}
