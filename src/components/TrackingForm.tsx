"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { TrackingGroup, TrackingView } from "@/lib/orders";
import { formatThaiDateTime } from "@/lib/datetime";
import { site } from "@/config/site";
import { CheckIcon } from "./icons";

type Status = "idle" | "loading" | "notFound" | "tooMany" | "error";

type Props = { locale: Locale; t: Dictionary["track"]; cal: Dictionary["calculator"] };

// ไทม์ไลน์ของสินค้าแต่ละตู้
function Timeline({ group, locale, t }: { group: TrackingGroup; locale: Locale; t: Dictionary["track"] }) {
  const doneCount = group.stages.filter((s) => s.at).length;
  return (
    <ol>
      {group.stages.map((s, i) => {
        const done = Boolean(s.at);
        const isCurrent = i === doneCount - 1;
        const isLast = i === group.stages.length - 1;
        return (
          <li key={s.stage} className="relative flex gap-4 pb-5 last:pb-0">
            {!isLast && (
              <span
                className={`absolute top-8 left-[15px] h-[calc(100%-2rem)] w-0.5 ${i < doneCount - 1 ? "bg-brand-500" : "bg-gray-200"}`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                done ? "bg-brand-600 text-white" : "border-2 border-gray-200 bg-white text-gray-300"
              } ${isCurrent ? "ring-4 ring-brand-100" : ""}`}
            >
              {done ? <CheckIcon className="h-4 w-4" /> : <span className="text-xs font-semibold">{i + 1}</span>}
            </span>
            <div className="pt-1">
              <p className={`font-medium ${isCurrent ? "text-brand-700" : done ? "text-gray-900" : "text-gray-400"}`}>
                {t.stages[s.stage]}
              </p>
              <p className="text-sm text-gray-500">{s.at ? formatThaiDateTime(new Date(s.at), locale) : t.waiting}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function TrackingForm({ locale, t, cal }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [order, setOrder] = useState<TrackingView | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setOrder(null);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.status === 404) return setStatus("notFound");
      if (res.status === 429) return setStatus("tooMany");
      if (!res.ok) return setStatus("error");
      setOrder((await res.json()).order);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const errorText = { notFound: t.notFound, tooMany: t.tooMany, error: t.error } as const;
  const methodLabel = (m: string) => (m === "truck" ? cal.truck : m === "sea" ? cal.sea : m);

  return (
    <div className="space-y-8">
      {/* method="post": ถ้ากดก่อน JS โหลดเสร็จ เบอร์โทรจะไม่ไปโผล่ใน URL */}
      <form onSubmit={onSubmit} method="post" className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t.trackingNo}</span>
          <input name="trackingNo" required minLength={3} maxLength={40} autoComplete="off" className="input uppercase" />
          <span className="mt-1 block text-xs text-gray-500">{t.trackingNoHint}</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t.phoneLast4}</span>
          <input
            name="phoneLast4"
            required
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            autoComplete="off"
            className="input tracking-widest"
          />
          <span className="mt-1 block text-xs text-gray-500">{t.phoneHint}</span>
        </label>
        <button type="submit" disabled={status === "loading"} className="btn-primary sm:mb-5">
          {status === "loading" ? t.searching : t.submit}
        </button>
      </form>

      {status in errorText && (
        <p className="rounded-lg bg-brand-50 px-4 py-3 text-brand-700">
          {errorText[status as keyof typeof errorText]}
        </p>
      )}

      {order && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 text-white">
              <p className="text-sm text-brand-100">{t.trackingNo}</p>
              <p className="text-2xl font-bold tracking-wide">{order.code}</p>
              <p className="mt-3 inline-block rounded-full bg-accent-400 px-3 py-1 text-sm font-semibold text-brand-800">
                {t.currentStatus}: {t.stages[order.stage]}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-4 px-6 py-4 text-sm">
              <div>
                <dt className="text-gray-500">{t.method}</dt>
                <dd className="font-semibold">{methodLabel(order.method)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">{t.items}</dt>
                <dd className="font-semibold">{order.itemCount} {t.itemsUnit}</dd>
              </div>
              <div>
                <dt className="text-gray-500">{t.delivered}</dt>
                <dd className="font-semibold">{order.deliveredCount}/{order.itemCount}</dd>
              </div>
            </dl>
            {order.note && (
              <p className="border-t border-gray-100 px-6 py-4 text-sm">
                <span className="text-gray-500">{t.note}: </span>{order.note}
              </p>
            )}
          </div>

          {order.groups.map((g, gi) => (
            <div key={g.container?.code ?? `none-${gi}`} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4">
                <p className="font-semibold">
                  {g.container ? `${t.container} ${g.container.code}` : t.notInContainer}
                  {g.container && <span className="ml-2 text-sm font-normal text-gray-500">({methodLabel(g.container.method)})</span>}
                </p>
                <ul className="w-full text-sm text-gray-600">
                  {g.items.map((it, i) => (
                    <li key={i}>
                      • {it.description}
                      {it.quantity ? ` × ${it.quantity}` : ""}
                      {it.boxes ? ` (${it.boxes} ${t.boxes})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
              <Timeline group={g} locale={locale} t={t} />
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-sm text-gray-600">
        <a href={site.lineUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
          {t.help}
        </a>
      </p>
    </div>
  );
}
