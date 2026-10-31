# SANHA

China sourcing / shipping / CNY payment business website (Thai market). Next.js 16 App Router, TypeScript, Tailwind v4.

- All pages live under `src/app/[locale]/` (`th` default, `en`). `src/proxy.ts` redirects locale-less URLs.
- UI text goes in `src/i18n/dictionaries/{th,en}.json` — keep both files' keys identical (`th.json` is the type source).
- Knowledge base = Markdown in `content/kb/<locale>/<slug>.md` with frontmatter (title, description, category, order). Same slug in both locales. Categories are defined in `src/lib/kb.ts`.
- Rates and contact info are config, not code: `src/config/rates.ts` (shipping rates per product type × method), `src/config/site.ts`. Current values are placeholders.
- The CNY exchange rate is deliberately never shown on the site — customers ask on LINE.
- Quote form posts to `src/app/api/quote/route.ts`, which pushes a LINE Messaging API message (env: `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_TARGET_ID`; logs only if unset).
- Commands: `npm run dev`, `npm run build`, `npm run typecheck`.
