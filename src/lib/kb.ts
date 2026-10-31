import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import type { Locale } from "@/i18n/config";

// บทความอยู่ที่ content/kb/<locale>/<slug>.md
const KB_DIR = path.join(process.cwd(), "content", "kb");

export const kbCategories = ["getting-started", "shipping", "payment", "policies"] as const;
export type KbCategory = (typeof kbCategories)[number];

export type KbArticleMeta = {
  slug: string;
  title: string;
  description: string;
  category: KbCategory;
  order: number;
};

function readFile(locale: Locale, slug: string) {
  const file = path.join(KB_DIR, locale, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  const meta: KbArticleMeta = {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
    category: (data.category ?? "getting-started") as KbCategory,
    order: Number(data.order ?? 99),
  };
  return { meta, content };
}

export function getArticleSlugs(locale: Locale): string[] {
  const dir = path.join(KB_DIR, locale);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export function getArticles(locale: Locale): KbArticleMeta[] {
  return getArticleSlugs(locale)
    .map((slug) => readFile(locale, slug)!.meta)
    .sort((a, b) => a.order - b.order);
}

// หน้าเนื้อหาทั่วไป เช่น นโยบายความเป็นส่วนตัว อยู่ที่ content/pages/<locale>/<slug>.md
export async function getPage(locale: Locale, slug: string) {
  const file = path.join(process.cwd(), "content", "pages", locale, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  return {
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
    html: await marked.parse(content),
  };
}

export async function getArticle(locale: Locale, slug: string) {
  const file = readFile(locale, slug);
  if (!file) return null;
  return { ...file.meta, html: await marked.parse(file.content) };
}
