# SearchConsole

Web sitelerinizin Google performansını tek ekrandan takip eden dashboard.

Kullanıcı `property`, `OAuth`, `impression` gibi teknik terimlerle hiç karşılaşmaz;
arka planda Google Search Console verisi otomatik toplanır, ön tarafta yalnızca
"ne oldu / neden önemli / ne yapmalıyım" cevapları gösterilir.

## Belgeler

- [Ürün spec'i](docs/superpowers/specs/2026-08-19-search-performance-spec.md) — ekranlar, dil kuralları, ölçek varsayımları
- [Implementasyon planı](docs/superpowers/plans/2026-08-19-search-performance.md) — 26 task, TDD adımlarıyla

## Teknoloji

TypeScript · Next.js (App Router) · PostgreSQL + Drizzle · Redis + BullMQ · Auth.js · Tailwind + shadcn/ui · Vitest + Playwright

## Durum

Planlama tamamlandı, uygulama henüz başlamadı. Task 1 ile başlanır.
