# Сверка — WP-APP-03 (PR https://github.com/ITSalt/stn-contract-checker/pull/5, `4fedbaaedb` -> `main @ 75bb02a165`) — 2026-10-30

Раунд 2. Дифф: 5 files changed, 299 insertions(+), 10 deletions(-) (файлов: 5).

**Решение: `ACCEPTED WP-APP-03`** — пункт 1 закрыт в движке с тестом, README описывает фактическое поведение.

graph: checked — `spec_graph: none`; раздел «Что прислать» сверен в раунде 1.

## Пункты REVISE

нет

### Не требуется

—

## Вопросы владельцу

- P-1 открыт у владельца (реализован (б)).

## Принято как есть / backlog

- Изменения `src/engine/classify.ts`, `resolve.ts`, `robustness.test.ts` — по пункту REVISE, разрешённые пути пакета дополнены.
- Документ с несколькими номерами договоров: изменения из него не показываются как предложения (только issue + needs_review у договоров) — принято, закупщик видит «требует проверки» и документ.

## Автоматические находки

- **пути и замки**: WP-APP-03: src/engine/classify.ts is outside the allowed paths
- **пути и замки**: WP-APP-03: src/engine/resolve.ts is outside the allowed paths
- **пути и замки**: WP-APP-03: src/engine/robustness.test.ts is outside the allowed paths

Дифф ревизии (пересдачи): git -C <репозиторий> diff 0e428e9d31cdbdf13aad63efd7e136790f6ba7a6 4fedbaaedb1ccd227c149946bb630683588e95b7

---

## Отчёт рецензента (дословно)

Пересдача сверена оркестратором на `4fedbaa`: дифф ревизии — 4 файла, +74/−4 (`classify.ts`: для не-договоров добираются номера той же серии по всему тексту; `resolve.ts`: issue `ambiguous_link` ещё и у каждого названного договора; 2 теста; README — описание связи и время 10:24). Одноразовый клон: vitest, `tsc`, `build` — exit 0. Временный тест: письмо о STN-301 и STN-302 → `issues=[ambiguous_link]`, у обоих договоров `needsReview=true`, pending 0; эталон `documents/` без изменений (STN-101 1 380 000 / 30.04.2026 / 2 pending; STN-102 840 000 / 20.03.2026 / 1 pending; STN-103 null / 30.04.2026), глобальных issues 0. Клон удалён.
