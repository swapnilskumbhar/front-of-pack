# V3 brief — fixes and the output synthesis

**Written:** 24 August 2026 · **Deadline:** 28 August 2026, 20:00 IST (no grace period)

Two parts. **Part A** is defect repair, including one live bug on the headline demo. **Part B** adds
back what the earlier LabelSensei output did better, without reintroducing the model-generated score
that the architecture exists to prevent.

The governing principle is unchanged: **the model transcribes, a pure versioned engine decides.**
Everything proposed here is deterministic and publishable on `/how-we-decide`. Nothing in this brief
asks the model for a judgement.

---

# Part A — Defects

## A1 🔴 The sulphate claim test fails on real Indian packs

**This is live and it breaks the flagship demo.** Two independent causes:

1. `src/engine/claim-audit.ts:20` matches with exact equality:
   `normalizedIngredients.some((ingredient) => ingredient === normalize(needle))`
2. `src/knowledge/claim-tests.ts` lists only American spellings — no `sulphate` anywhere in
   `contradictingIngredients`, even though the *claim pattern* correctly handles both
   (`/\bsul(?:ph|f)ate[- ]free\b/iu`).

Measured against realistic tokens:

```
MISS | "sodium laureth sulphate"        <- British spelling, dominant on Indian packs
MISS | "sodium lauryl sulphate"         <- British spelling
HIT  | "sodium laureth sulfate"         <- US spelling, the only one in the list
MISS | "sodium laureth sulfate (sles)"  <- bracketed abbreviation, very common
HIT  | "sles"
MISS | "sodium lauryl sulfoacetate"     <- correct, must NOT match
```

**`tests/claim-engine.test.ts:7` hides this.** It passes `["aqua", "sles", "fragrance"]` — the single
token that happens to match exactly. 52/52 green while the headline check is broken.

### Fix

Replace exact equality with **word-boundary containment**, which still correctly rejects
`sulfoacetate`:

```ts
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const containsIngredient = (haystack: string, needle: string): boolean =>
  new RegExp(`\\b${escapeRegex(normalize(needle))}\\b`, "u").test(haystack);
```

Add British spellings to `claim.sulphate-free.contradictingIngredients`:
`sodium lauryl sulphate`, `sodium laureth sulphate`, `ammonium lauryl sulphate`,
`ammonium laureth sulphate`, `sodium coco sulphate`, `sodium c12-15 pareth sulfate`,
`sodium c12-15 pareth sulphate`.

Apply the same British/American pass to every other test's ingredient list.

### Required tests

Extend `tests/claim-engine.test.ts` with all seven rows of the table above as explicit assertions —
the four MISS-that-should-HIT cases, the two HITs, and the sulfoacetate near-miss that must stay
negative. A green suite that does not contain `sulphate` is not a green suite.

## A2 Missing claim tests

Only four tests exist and one is food-only, while the hero promises "claim contradictions".

Add:

| id | Claim patterns | Contradicting evidence | Category |
|---|---|---|---|
| `claim.hundred-percent-natural` | `100% natural`, `all natural`, `fully natural` | any INS/E-number additive token, plus named synthetic surfactants and synthetic preservatives | cosmetic, personal_care, food, beverage |
| `claim.chemical-free` | `chemical free`, `no chemicals` | same list as above | cosmetic, personal_care, household |
| `claim.non-toxic` | `non[- ]toxic`, `no toxins` | **do not implement as an ingredient test** — see note |

**`100% natural`:** the defensible test is the presence of an INS/E-numbered additive or a named
synthetic surfactant/preservative. Do not attempt to classify "naturalness" generally. The limitation
string must say: *literal presence of a numbered additive or named synthetic ingredient; this is not
a chemical-classification or formulation judgement.*

**`non-toxic`:** skip it. Toxicity is a dose-and-exposure question with no readable proxy on a pack.
Implementing it would be the first unfalsifiable claim in the engine. Leaving it out is the correct
call and should be stated on `/how-we-decide` as a deliberate exclusion.

## A3 Only the first signal renders

`src/app/scan/upload-analyser.tsx:154` reads `.signals[0]`. A product with both a claim contradiction
*and* a whole-pack warning shows one of them. Render up to **two** signals per item, claim
contradiction first (it is always `severity: "high"`).

## A4 Rounding is inconsistent within one card

The live AloFrut output shows `31.5 g`, `32%`, and `31.5%` inside three adjacent lines. Two of those
are the same underlying number and it reads as a defect.

In `src/engine/presentation.ts`, round `printedServingRdaPercent` and `wholePackRdaPercent` to
**one decimal** consistently, and ensure the model's own findings do not restate a number the derived
signal already shows.

## A5 Demo fixtures are synthetic and have no image

`src/demo/results.ts` is hand-authored (`"Cached demonstration from a fixed synthetic pack fixture."`),
honestly labelled but weaker than it needs to be, and `public/` contains no demo images at all — a
reviewer sees a verdict with no pack.

Replace with **three real cached analyses plus their photographs**: the Haldiram front-of-pack (web
search path), the AloFrut bottle (whole-pack 63% path), and a cart screenshot (six products). Keep
honest provenance: *"Cached result from a real analysis run on <date>."*

## A6 Smaller items

- `engine_version` is not persisted. `attachDecisions` is wired correctly at
  `workers/jobs/src/index.ts:255`, but add `engine_version` to `PINNED_ANALYSIS_VERSIONS` and a
  migration `0004`, so a stored result records which engine decided it.
- `identity.confidence` is extracted and rendered nowhere. Surface it (see B5).
- **Cut the registry.** `src/public-services/registry.ts` holds two synthetic rows with exact-match
  lookup; it reads as a stub and costs more credibility than it earns. Remove the card and the route,
  and spend the time on Part B. Keep grievance and officer.
- The `workers.dev` URL looks unfinished. A custom domain is a cheap credibility win.

---

# Part B — What the output is missing

## The diagnosis

The earlier LabelSensei output answered **the shopper's question**. The current output answers
**the regulator's question**. The current one is more rigorous and less useful.

Old output, for reference:

```
Product: Facial Oil
Rating: 8/10 (Hygiene: Chemical Safety)
Profile: VEG + BOTANICAL
Verdict: Rich botanical blend, suitable for skin, contains animal byproduct.
Confidence: High

Analysis:
· Goat Milk: Animal byproduct, not vegan.
· Sesame Oil: Natural carrier oil, generally safe.
```

Four things it did better, all recoverable deterministically:

1. **A values/diet profile.** Often the first question an Indian shopper has, backed by a legally
   mandated pack symbol, and entirely absent from the current build. Biggest miss.
2. **A one-line verdict** carrying the whole story *and* the caveat.
3. **Named ingredient → consequence for the person**, not a description of the pack.
4. **A stated confidence.**

## B0 What must not come back

**`Rating: 8/10`.** There is no answer to "what are the two missing points for", and a
model-generated score would put a hole in the middle of `/how-we-decide`. It stays out.

The at-a-glance need behind it is real, and B4 meets it without an unfalsifiable number.

## B1 🟢 Dietary and values engine — the main build

Structurally identical to the claim-audit pattern already in the repo. Reuse it directly.

**New `src/knowledge/ingredient-dictionary.ts`**

```ts
export type DietFlag =
  | "animal_derived"
  | "may_be_animal_derived"
  | "insect_derived"
  | "milk_derived"
  | "egg_derived"
  | "jain_excluded"
  | "common_allergen";

export interface IngredientEntry {
  id: string;                       // "ins.631"
  tokens: readonly string[];        // every printed form, incl. INS number and full name
  displayName: string;              // "INS 631 (disodium inosinate)"
  flags: readonly DietFlag[];
  note: string;                     // one plain-language line, shown to the user
  sourceUrl: string;
  limitation: string;
}
```

Seed ~40 entries — that reaches roughly 80% of real-world value. Priority entries:

| Ingredient | Flag | Note |
|---|---|---|
| INS 631 disodium inosinate | `may_be_animal_derived` | commonly from fish or meat, can be fermented from tapioca |
| INS 627 disodium guanylate | `may_be_animal_derived` | can be from fish or from yeast |
| INS 120 carmine / cochineal | `insect_derived` | pigment from cochineal insects |
| INS 904 shellac | `insect_derived` | resin secreted by the lac insect |
| INS 471 mono- and diglycerides | `may_be_animal_derived` | can be from animal fat or vegetable oil |
| INS 441 / gelatin | `animal_derived` | from animal collagen |
| INS 920 L-cysteine | `may_be_animal_derived` | can be from feathers or hair, or produced synthetically |
| rennet | `may_be_animal_derived` | can be from calf stomach or microbial |
| onion, garlic | `jain_excluded` | excluded from many Jain diets |
| potato, carrot, radish, beetroot, ginger | `jain_excluded` | root vegetables, excluded from many Jain diets |
| wheat, soy, milk, peanut, tree nuts, egg, fish, crustacean, sulphite | `common_allergen` | FSSAI-declarable allergens |

**New `src/engine/diet-audit.ts`**

```ts
export function evaluateDiet(
  ingredientTokens: readonly string[] | undefined,
  printedVegMark: "veg" | "non_veg" | null,
  category: ProductCategory,
): DietSignal[]
```

Two signal kinds:

- **`diet_profile`** — the flags present, summarised. Not a warning; the equivalent of
  `Profile: VEG + BOTANICAL`.
- **`veg_mark_conflict`** — 🔴 **the headline case.** The pack carries the vegetarian mark required by
  the FSS (Labelling and Display) Regulations, 2020 *and* lists an ingredient flagged
  `may_be_animal_derived` / `insect_derived` / `animal_derived`.

The Haldiram sample already read `flavour enhancers (627, 631)`, so this fires on a pack you have
photographed. Required copy — an information gap made visible, never an accusation:

> ⚠ **May contain animal-derived ingredients.** The pack shows a vegetarian mark and lists INS 631
> (disodium inosinate), which can be animal- or plant-derived. The pack does not state which.

**Extraction changes.** Add to the item schema in `workers/jobs/src/openai/schema.ts`:

```ts
printedVegMark: { type: ["string","null"], enum: ["veg","non_veg", null] }
```

Prompt instruction: *transcribe the printed vegetarian/non-vegetarian mark if visible; null
otherwise; never infer it from the ingredient list.* The whole point is that the engine compares the
mark against the ingredients — the model must not do that comparison itself.

**Jain must not adjudicate religious practice.** Phrase as *"contains ingredients many Jain diets
exclude: onion, garlic"* with a limitation noting that observance varies. No tool in India serves
this constituency and the token list is trivial.

## B2 Personalisation — same pack, different answer

`migrations/0001_initial.sql:5` already defines a stable `profiles` row, keyed by hashed device token
*and* hashed phone via `profile_identities`. Both surfaces resolve to a `profileId` today.

One migration adds:

```sql
ALTER TABLE profiles ADD COLUMN dietary_profile TEXT;  -- json: {veg, vegan, jain, halal}
ALTER TABLE profiles ADD COLUMN allergens TEXT;        -- json: string[] of allergen ids
```

Then `evaluateDiet` takes the profile and promotes matching flags to `severity: "high"`. A vegetarian
user and an omnivore get materially different output from the same photograph — deterministically,
on web and WhatsApp, from one engine.

Privacy line to hold: dietary preference is stored against a hashed identity, never against a phone
number or any raw token, consistent with existing practice.

## B3 Deterministic verdict line

Template-assembled from engine signals so it stays reproducible. Never model-authored.

> **Verdict:** 63% of your daily added sugar in one bottle. Vegetarian. No claim conflicts found.

Each clause maps to a signal or to an explicit "no signal found". Publish the template on
`/how-we-decide` alongside the formulas.

## B4 Check strip — the honest replacement for a score

Renders which checks ran and what each returned:

```
Diet ⚠ may contain animal-derived · Allergens ⚠ wheat, soy · Whole pack ✓ · Claims ✓
```

Four dimensions, each traceable to a rule ID. A check that could not run shows as `—` with the reason
on hover, never as a pass.

## B5 Surface confidence

`identity.confidence` already exists in the schema and renders nowhere. Show it, and suppress derived
signals entirely when identity confidence is `low` or `unknown` *and* the signal depends on identity
resolution rather than on directly transcribed pack values.

---

# Order of work

| Priority | Item | Est. |
|---|---|---|
| 1 | **A1** sulphate fix + real tests | 20 min |
| 2 | **A3, A4** two signals, consistent rounding | 45 min |
| 3 | **B1** dietary engine + ingredient dictionary + `printedVegMark` | ~1 day |
| 4 | **B3, B4, B5** verdict line, check strip, confidence | 2 h |
| 5 | **A5** real cached demos with photographs | 2 h |
| 6 | **B2** profile personalisation | 3 h |
| 7 | **A2** additional claim tests | 1 h |
| 8 | **A6** engine_version, cut registry, custom domain | 1 h |

Pay for this by **cutting the registry (A6)**. If time runs short, drop **B2** before **B1** — the
dietary engine works without personalisation; personalisation is worthless without it.

**Do not let this crowd out the submission artifacts.** The video (≤2 min: minute one citizen demo,
minute two build rationale), the sub-250-word summary, and the mandatory explanation of Codex's
contribution are all still required and are worth more than items 5–8 combined.

# Acceptance

```bash
npm test && npm run lint && npm run typecheck && npm --prefix workers/jobs run typecheck
```

- `tests/claim-engine.test.ts` contains the word `sulphate` and asserts all seven rows of A1.
- `tests/diet-engine.test.ts` asserts: veg mark + INS 631 produces `veg_mark_conflict`; veg mark
  alone produces none; INS 631 without a veg mark produces `may_be_animal_derived` only; onion
  produces `jain_excluded`; an empty token list produces nothing.
- Every new dictionary entry and diet rule appears automatically on `/how-we-decide` with a live
  source link — the page is generated from the tables, so nothing may be hardcoded into it.
- Re-running `evaluateAnalysis()` over a stored result reproduces identical signals with no model
  call.
- WhatsApp and web render the same signals from the same engine for the same photograph.
