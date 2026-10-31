# SANHA

China sourcing / shipping / CNY payment business website (Thai market). Next.js 16 App Router, TypeScript, Tailwind v4.

- All pages live under `src/app/[locale]/` (`th` default, `en`). `src/proxy.ts` redirects locale-less URLs.
- UI text goes in `src/i18n/dictionaries/{th,en}.json` — keep both files' keys identical (`th.json` is the type source).
- Knowledge base = Markdown in `content/kb/<locale>/<slug>.md` with frontmatter (title, description, category, order). Same slug in both locales. Categories are defined in `src/lib/kb.ts`.
- Rates and contact info are config, not code: `src/config/rates.ts` (shipping rates per product type × method), `src/config/site.ts`. Current values are placeholders.
- The CNY exchange rate is deliberately never shown on the site — customers ask on LINE.
- Back office at `/admin` (Thai only, outside `[locale]`; excluded in `src/proxy.ts`). Every page and server action calls `requireUser()` from `src/lib/auth.ts` (HMAC-signed cookie, `AUTH_SECRET`). Staff accounts in `users`; first one via `npm run user:create`.
- DB: Drizzle + libsql (`src/db`), `local.db` in dev, Turso in prod. Schema change → `npm run db:generate` then `db:migrate`.
- Domain: order → many order_items; each item sits in at most one container, so an order can span containers. Transit stages live on the container (updating it moves every item); China-warehouse receipt and delivery live on items (partial delivery). Stage logic is in `src/lib/stages.ts`; order status = slowest item. `provider` + `external_id` on orders/containers are for a future partner-API sync.
- Customer tracking (`/[locale]/track` → `src/app/api/track/route.ts` → `getTrackingView` in `src/lib/orders.ts`) needs order code + phone last 4, rate-limited per IP; groups items by container.
- Quote form posts to `src/app/api/quote/route.ts`, which pushes a LINE Messaging API message (env: `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_TARGET_ID`; logs only if unset).
- Commands: `npm run dev`, `npm run build`, `npm run typecheck`.
