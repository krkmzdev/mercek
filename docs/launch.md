# Launch — draft copy

Video walkthroughs (spec §12) are out of scope for this build (cannot be
generated here) — record 5 × 2–3 min screen captures per sector before posting.

---

## Show HN

**Show HN: Mercek — a sector-aware AI analyst (five domain experts, one framework)**

Most "AI reads your spreadsheet" tools are generic: they don't know what food
cost, OEE, or a leaky bucket is. Mercek is the opposite bet — it encodes five
sectors' domain intelligence as code behind one engine.

- Retail, F&B, Finance, Manufacturing, SaaS — each with its own canonical
  schema, KPI library, benchmarks, and analyst prompt.
- Every KPI carries its formula and the source cell that produced it; the UI
  can't render a number without provenance.
- It flags missing data instead of fabricating (no cost column → margin is
  "unavailable", and the prompt is told, so the model doesn't hallucinate).
- Each sector ships a synthetic fixture with planted problems + an answer key;
  a live-LLM eval scores recall. All five pass 3/3.

Signature moves: F&B menu-engineering matrix, Finance TÜFE real-return engine
(nominal growth deflated by Turkish CPI → real contraction), Manufacturing OEE
decomposition that names the binding constraint, SaaS Quick Ratio exposing the
leaky bucket.

Adapter SDK is public and has zero dependency on the engine — you can write a
new sector in ~200 lines. Demo (synthetic data): <link>. Code: <repo>.

## LinkedIn

Türkçe: KOBİ’ler veriye sahip, yorumcuya sahip değil. Mercek, ham işletme
verisini o sektörün diline hâkim bir AI analist gibi okur — perakende, F&B,
finans, üretim ve SaaS için tek çatı, beş ayrı beyin.

Öne çıkan: Finans için TÜFE-reel büyüme motoru — %38 nominal büyümenin %44
enflasyonda aslında reel daralma olduğunu açıkça söyler. Her sayı kaynak
hücresine iner; olmayan veriyi uydurmaz, işaret eder.

Sentetik örnek veriyle deneyin: <link>

## dev.to (outline)

1. The wedge: generic AI is sector-blind.
2. The spine: the `SectorAdapter` contract (one file per sector).
3. Provenance everywhere: SourceRef from extract to report.
4. Evals as a first-class asset: planted problems + answer keys.
5. The honesty constraints enforced by the type system.
6. Write your own adapter.
