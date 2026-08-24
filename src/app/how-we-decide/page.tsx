import Link from "next/link";

import { ENGINE_VERSION } from "@/engine/types";
import { RATING_DEDUCTION_RULES } from "@/engine/rating";
import { INTAKE_VERSION } from "@/intake/image";
import { CLAIM_TESTS } from "@/knowledge/claim-tests";
import { INGREDIENT_DICTIONARY } from "@/knowledge/ingredient-dictionary";
import { RULE_PACKS } from "@/knowledge/rule-packs";

export default function HowWeDecidePage() {
  return <main className="service-page decision-page">
    <Link href="/">← Front of Pack</Link>
    <p className="eyebrow">Open decision logic · {INTAKE_VERSION.prompt} · {INTAKE_VERSION.schema} · {ENGINE_VERSION}</p>
    <h1>Every warning keeps its evidence.</h1>
    <p>Terra reads the package and matched sources once. Code validates every evidence link, then adds reproducible package arithmetic without another model call.</p>

    <section className="service-card decision-flow">
      <h2>One model call, then reproducible decisions</h2>
      <ol><li><b>Read + research</b><span>Package facts and exact-product sources in one Terra response.</span></li><li><b>Validate</b><span>Schema, bounds, provenance, citations, profile/claim evidence and source IDs.</span></li><li><b>Calculate</b><span>Warnings, RDA, rating, claim, diet and allergen functions—no second model call.</span></li></ol>
    </section>

    <section className="service-card" id="warning-authority">
      <p className="eyebrow">Required product-evidence search</p>
      <h2>What does online matching do?</h2>
      <p>Every fresh analysis gives Terra hosted search access. It researches the exact Indian product and pack across nutrition, ingredients, additives, allergens, claims and warnings instead of stopping at identity or the first issue.</p>
      <div className="decision-grid">
        <article><span>01</span><h3>Package wins</h3><p>Clearly readable package facts take priority over conflicting online content.</p></article>
        <article><span>02</span><h3>Exact source first</h3><p>Manufacturer evidence is preferred; an exact-product retailer can fill a missing panel.</p></article>
        <article><span>03</span><h3>Match is explicit</h3><p>Brand, variant, market and pack-size differences lower confidence and qualify conclusions.</p></article>
        <article><span>04</span><h3>Sources remain visible</h3><p>Package and online evidence, citations, limitations and versions stay expandable on the website.</p></article>
      </div>
    </section>

    <section className="service-card">
      <p className="eyebrow">At-a-glance indicator</p>
      <h2>What appears first?</h2>
      <div className="decision-grid">
        <article><span>🔴</span><h3>Engine warning</h3><p>Red is reserved for a high signal reproduced by published code. On the web, each red line links to its rule.</p></article>
        <article><span>🟠</span><h3>Context or moderate signal</h3><p>Amber covers moderate calculations and evidence-backed package or search context. Terra cannot make a line red.</p></article>
        <article><span>🟢</span><h3>Useful positives</h3><p>Fibre, whole grain, vegetarian marks and supported claims follow warnings and never cancel them.</p></article>
        <article><span>⚪</span><h3>Unknowns</h3><p>Missing evidence is stated once. It is never converted into a warning, pass or invented value.</p></article>
      </div>
      <p className="decision-note">The Supreme Court’s 10 February 2026 order illustrates separate front-of-package warnings for high sodium, high sugar and high saturated fat. Front of Pack follows that warning-first direction without presenting the illustration as enacted thresholds. <a href="https://api.sci.gov.in/supremecourt/2025/35988/35988_2025_6_12_68509_Order_10-Feb-2026.pdf" target="_blank" rel="noreferrer">Read the order ↗</a></p>
    </section>

    <section className="service-card" id="rule-rating">
      <p className="eyebrow">Experimental rule-based rating</p>
      <h2>Why is it 5 and not 4?</h2>
      <p>Terra does not author the score. The engine starts at 10, keeps the strongest deduction per topic, subtracts these fixed points and shows the arithmetic.</p>
      <code>score = max(0, 10 − fixed deductions)</code>
      <div className="decision-grid">{RATING_DEDUCTION_RULES.map((rule) => <article key={rule.id}><span>−{rule.points}</span><h3>{rule.label}</h3><p>{rule.id.replaceAll("_", " ")}</p></article>)}</div>
      <p className="decision-note">Nutrition keeps only the strongest whole-pack/reference deduction for each nutrient. Each literal claim test is separate; overlapping explicit diet/veg-origin signals deduplicate, and the allergen profile deducts once.</p>
      <p className="decision-note">No reproducible deduction means no score—not 10/10. This experimental shopper aid is not the draft or official FSSAI Indian Nutrition Rating, a medical assessment, safety certification or compliance decision. <a href="https://www.fssai.gov.in/upload/uploadfiles/files/Draft_Notification_HFSS_20_09_2022.pdf" target="_blank" rel="noreferrer">FSSAI draft context ↗</a></p>
    </section>

    <section className="service-card" id="rule-whole-pack-rda">
      <p className="eyebrow">Serving-size reality</p>
      <h2>What does the whole pack mean?</h2>
      <code>derived RDA = serving amount ÷ (printed serving %RDA ÷ 100)</code>
      <code>whole-pack % = whole-pack amount ÷ derived RDA × 100</code>
      <div className="worked-example"><b>Worked example</b><span>12.6 g saturated fat / 100 g · 20 g serving · 11% printed RDA · 52 g packet</span><strong>Whole packet ≈ 29%</strong></div>
      <p className="decision-note">A signal appears only when the whole pack is at least 25% of the pack-derived reference and at least 1.5× its printed serving percentage. “Moderate” and “high” are presentation bands, not regulatory classifications.</p>
      <h3 id="rule-reference-rda">When printed %RDA is unavailable</h3>
      <code>calculated %RDA = nutrient amount ÷ FSSAI adult reference × 100</code>
      <p>References: 50 g added sugar · 22 g saturated fat · 2,000 mg sodium. The response shows the absolute value and calculated percentage together, labelled by scope: per 100 g/ml, per serving, or whole pack.</p>
      <p className="decision-note">Printed %RDA always wins. A calculated percentage is explicitly labelled and uses whole-pack scope only when exact net quantity is available. Web-derived nutrition remains marked as an online match. <a href="https://fssai.gov.in/upload/advisories/2022/02/6214c8ca94fedMinutes_FOPL_22_02_2022.pdf" target="_blank" rel="noreferrer">Official FSSAI reference context ↗</a></p>
    </section>

    <section className="service-card" id="rule-diet-profile">
      <span id="rule-allergen-profile" className="anchor-target" />
      <span id="rule-veg-mark-conflict" className="anchor-target" />
      <span id="rule-source-unclear" className="anchor-target" />
      <p className="eyebrow">Dietary source and allergens</p>
      <h2>Which printed ingredients are recognized?</h2>
      <div className="decision-grid">{INGREDIENT_DICTIONARY.map((entry) => <article key={entry.id}>
        <span>{entry.id}</span><h3>{entry.displayName}</h3>
        <p>Printed forms: {entry.tokens.join(", ")}</p>
        <p>Flags: {entry.flags.join(", ")}</p>
        <a href={entry.sourceUrl} target="_blank" rel="noreferrer">Source context ↗</a>
        <small>{entry.note} {entry.limitation}</small>
      </article>)}</div>
      <p className="decision-note">INS 627, 631, 471 and 920 never prove animal origin; they report that the source is not stated. “Non-toxic,” “chemical-free,” halal status and general naturalness are deliberate exclusions because a photograph cannot establish them reliably.</p>
    </section>

    <section className="service-card" id="rule-claim-consistency">
      <p className="eyebrow">Literal package consistency</p>
      <h2>Which claim checks run?</h2>
      <div className="decision-grid">{CLAIM_TESTS.map((test) => <article key={test.id}>
        <span>{test.id}</span><h3>{test.label}</h3>
        <p>Claim patterns: {test.claimPatterns.map((pattern) => pattern.source).join(" · ")}</p>
        <p>Contradicting printed ingredients: {test.contradictingIngredients.join(", ")}</p>
        <a href={test.sourceUrl} target="_blank" rel="noreferrer">Official context ↗</a>
        <small>{test.limitation}</small>
      </article>)}</div>
      <p className="decision-note">These checks report an apparent package inconsistency. They do not determine formulation, intent, legality, or enforcement liability.</p>
      <p className="decision-note">The Claims section appears only when a claim is visibly printed in the submitted image. Terra compares that exact wording with package facts and sufficiently matched sources, then marks it supported, partly supported, contradicted, not established or not assessable. Online-only marketing copy never creates the section.</p>
    </section>

    <section className="service-card">
      <p className="eyebrow">Verified context</p>
      <h2>Rule packs supplied to Terra</h2>
      <ul className="source-list">{RULE_PACKS.map((rule) => <li key={rule.id}><div><b>{rule.title}</b><small>{rule.status} · accessed {rule.source.accessedDate}</small></div><a href={rule.source.url} target="_blank" rel="noreferrer">Source ↗</a></li>)}</ul>
      <p className="decision-note">The CCPA Greenwashing Guidelines apply to environmental claims. Front of Pack does not automatically label every “free-from” cosmetic claim as greenwashing. <a href="https://consumeraffairs.nic.in/latestnews/guidelines-prevention-and-regulation-greenwashing-or-misleading-environmental-claims-2024" target="_blank" rel="noreferrer">Official guidelines ↗</a></p>
    </section>
  </main>;
}
