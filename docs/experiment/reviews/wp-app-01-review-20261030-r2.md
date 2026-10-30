# Сверка — WP-APP-01 (PR https://github.com/ITSalt/stn-contract-checker/pull/3, `a2ca6df09f` -> `main @ 53622df2e9`) — 2026-10-30

Раунд 2. Дифф: 40 files changed, 4662 insertions(+) (файлов: 40).

**Решение: `ACCEPTED WP-APP-01`** — все 5 пунктов REVISE закрыты и подтверждены мутациями; неверные значения из V3/V4/V6 больше не выдаются.

graph: checked — `spec_graph: none`; «Спецификация» — разделы задания, сверены в раунде 1.

## Пункты REVISE

нет

### Не требуется

—

## Вопросы владельцу

нет

## Принято как есть / backlog

- V3 («2.1. Цена: 840 000 рублей» + платёж 30%) теперь даёт `needs_review`, а не 840 000 ok: безопасно (нет выдуманного значения), но консервативно — кандидат в backlog.
- «Стоимость по договору составляет …» распознаётся как ok (отличие от формулировки п. 5 ревью, объявлено в PR) — принято: это корректная цена.

## Автоматические находки

- **merge-base**: WP-APP-01: branch point 7310050038 is 3 commits behind origin/main (no overlapping files) - rebase before merge

Дифф ревизии (пересдачи): git -C <репозиторий> diff 3d9f33214824e5b5b1ab853ff53c3f9463df2ee4 a2ca6df09f8905f249940675ed6ed7a80322f637

---

## Отчёт рецензента (дословно)

Пересдача сверена оркестратором на `a2ca6df` (дифф ревизии: 7 файлов, +217/−22; `amount.ts`, `deliveryDate.ts`, `text.ts` (`toCheckDate`, `DateInput`), `analyze.ts`, `queries.ts`, новый `revise1.test.ts`).
- Одноразовый клон: `npm ci`, vitest 70/70, `tsc --noEmit`, `npm run build` — exit 0; под `TZ=America/Los_Angeles` 70/70; grep AC3 пуст.
- Варианты рецензента через `analyze(…, '2026-03-10')`: эталон без изменений (STN-101 1 380 000 / 30.04.2026, STN-102 840 000 / 20.03.2026, STN-103 no_data / 30.04.2026, Q4 → STN-102 с письмом 27.03); V3 → STN-102 сумма needs_review; V4 → срок 20.03.2026 ok (не 10.04); V6 → STN-103 сумма needs_review (не 600 000); «включая НДС 20%» → 840 000 ok.
- Мутации (все пойманы): `resolve.ts:118` `>`→`>=` — 2 fail; `queries.ts:102` `<`→`<=` — 1 fail; удалить `undetermined.push` — 1 fail; убрать защиту по глаголу оплаты в `deliveryDate.ts` — 1 fail; отключить `CEILING` в `amount.ts` — 2 fail. Клон удалён.
