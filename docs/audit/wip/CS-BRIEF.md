# devShark Czech localisation pass — brief

You are localising reviewed devShark questions into natural Czech. For every item in your batch you produce the **final Czech** of four fields — `hint`, `question`, `options`, `explanation` — matching the **final English** exactly in meaning, and you judge whether the existing Czech can be kept.

## Non-negotiables
1. **Every item**, one JSON object per line, in batch order, appended as you go (see Output).
2. **Same question, same answer.** The Czech `options` array is a parallel translation of the English one: **same length (4), same order**. Never reorder, merge, split or "improve" options. The correct answer index is shared with English and is not in your input on purpose.
3. **Code is not translated.** Fenced code blocks, inline code (backticked), identifiers, API names, file names, commands, numbers, `true`/`false`/`null`/`undefined`, error messages quoted from a runtime, HTTP method and status names, and options that consist of code or values stay byte-for-byte identical. Translate only prose. Keep Markdown structure (fences, backticks, line breaks) identical.
4. **No new claims.** The Czech says what the English says — no added examples, hedges or explanations.
5. Do not edit any repository file.

## Style
Natural Czech as a developer colleague writes it: informal second person singular (tykání) as the product uses (`Otevři`, `Zkus`, `Vyber`), short sentences, established Czech developer vocabulary (`pole` for array, `řetězec` for string, `objekt`, `funkce`, `metoda`, `vlastnost`, `hodnota`, `prohlížeč`, `server`, `požadavek`, `odpověď`, `komponenta`, `stav`, `hook`, `middleware`, `proměnná`, `návratová hodnota`). Keep English terms that Czech developers use in English (`callback`, `promise`, `hook`, `props`, `commit`, `merge`, `rebase`, `branch`, `deploy`, `cache`, `token`, `endpoint`, `middleware`, `runtime`, `bundle`), declining them naturally where usual (`promisy`, `hooky`, `propsy` are fine in prose). No literal calques ("dělá smysl"), no anglicised word order, no typos in diacritics. A hint stays one or two sentences and never names an option or the answer.

## Input
Each item: `id`, `category`, `level`, `levelTitle`, `en` (the final English: `hint`, `question`, `options`, `explanation`), `cs` (the currently served Czech, or `null`), `reviewerCs` (`{ status, notes }` from the English review: `verified` means the reviewer found the existing Czech question/options/explanation faithful; `drift` means the Czech is a translation of an older English version; `defect` a translation error; `missing` none exists), `changed` (which English fields the review rewrote: usually `hint`, sometimes more).

## What to do per item
- If `reviewerCs.status` is `verified` **and** `changed` does not include `question`, `options` or `explanation`: keep the existing Czech `question`, `options`, `explanation` **verbatim** (copy them from `cs`), and write a new Czech `hint` from the English hint. Set `status: "kept"` (only the hint is new).
- Otherwise translate all four fields from the final English (`status: "rewritten"`). You may reuse phrases from the existing Czech where they are still exact.
- If the English contains something that cannot be localised without changing meaning, say so in `notes` and still produce your best faithful Czech.

## Output — JSON Lines, appended every 10 items
Path given in your task, `.jsonl`. One line per item, in batch order; if the file exists, resume after the last id in it. Schema:
```json
{"id":"rm-js-1","status":"kept","hint":"…","question":"…","options":["…","…","…","…"],"explanation":"…","notes":""}
```
Before finishing, re-open the file, check every line parses, that every item has exactly 4 options, that every fenced code block and every backticked token in the English appears unchanged in your Czech, and that the line count equals the batch count. Report the counts by status.
