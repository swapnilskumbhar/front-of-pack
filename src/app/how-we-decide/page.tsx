import Link from "next/link";

import { ENGINE_VERSION } from "@/engine/types";
import { CLAIM_TESTS } from "@/knowledge/claim-tests";
import { INGREDIENT_DICTIONARY } from "@/knowledge/ingredient-dictionary";
import { RULE_PACKS } from "@/knowledge/rule-packs";

export default function HowWeDecidePage() {
  return <main className="service-page decision-page">
    <Link href="/">← Front of Pack</Link>
    <p className="eyebrow">Open decision logic · {ENGINE_VERSION}</p>
    <h1>Every warning keeps its evidence.</h1>
    <p>Terra reads the package and matched sources once. Code validates every evidence link, then adds reproducible package arithmetic without another model call.</p>

    <section className="service-card decision-flow">
      <h2>One model call, then reproducible decisions</h2>
      <ol><li><b>Transcribe</b><span>Printed serving, quantity, %RDA, claims and ingredient names.</span></li><li><b>Validate</b><span>Schema, bounds, evidence and official source IDs.</span></li><li><b>Calculate</b><span>Pure functions—no second model call and no hidden paraphrasing.</span></li></ol>
    </section>

    <section className="service-card">
      <p className="eyebrow">At-a-glance indicator</p>
      <h2>What appears first?</h2>
      <div className="decision-grid">
        <article><span>🔴</span><h3>Every material warning</h3><p>All substantiated allergens, statutory warnings, high nutrients, claim conflicts and relevant ingredient concerns remain visible.</p></article>
        <article><span>🟠</span><h3>Provisional concerns</h3><p>Medium-match or incomplete facts stay clearly qualified instead of becoming definitive package claims.</p></article>
        <article><span>🟢</span><h3>Useful positives</h3><p>Fibre, whole grain, vegetarian marks and supported claims follow warnings and never cancel them.</p></article>
        <article><span>⚪</span><h3>Unknowns</h3><p>Missing evidence is stated once. It is never converted into a warning, pass or invented value.</p></article>
      </div>
      <p className="decision-note">The Supreme Court’s 10 February 2026 order illustrates separate front-of-package warnings for high sodium, high sugar and high saturated fat. Front of Pack follows that warning-first direction without presenting the illustration as enacted thresholds. <a href="https://api.sci.gov.in/supremecourt/2025/35988/35988_2025_6_12_68509_Order_10-Feb-2026.pdf" target="_blank" rel="noreferrer">Read the order ↗</a></p>
    </section>

    <section className="service-card">
      <p className="eyebrow">Experimental shopper rating</p>
      <h2>What does the 0–10 rating mean?</h2>
      <p>Terra authors this compact synthesis from the evidence available for the product and category. The validator rejects unresolved evidence links. A score appears only when at least three independent facts across two relevant dimensions are available.</p>
      <div className="decision-grid">
        <article><span>9–10</span><h3>Few material concerns</h3><p>Meaningful positive factors are supported by the available evidence.</p></article>
        <article><span>7–8</span><h3>Mostly favourable</h3><p>Minor concerns remain visible below the score.</p></article>
        <article><span>5–6</span><h3>Mixed profile</h3><p>Material concerns and useful positives both matter.</p></article>
        <article><span>0–4</span><h3>More caution</h3><p>Several material concerns or severe warnings are present.</p></article>
      </div>
      <p className="decision-note">This is an experimental label-based shopper rating—not an official FSSAI Indian Nutrition Rating, medical assessment, safety certification or compliance decision. Every rating carries an evidence-linked basis; insufficient evidence produces no score. The FSSAI INR proposal remains a draft. <a href="https://www.fssai.gov.in/upload/uploadfiles/files/Draft_Notification_HFSS_20_09_2022.pdf" target="_blank" rel="noreferrer">Read the draft ↗</a></p>
    </section>

    <section className="service-card">
      <p className="eyebrow">Serving-size reality</p>
      <h2>What does the whole pack mean?</h2>
      <code>derived RDA = serving amount ÷ (printed serving %RDA ÷ 100)</code>
      <code>whole-pack % = whole-pack amount ÷ derived RDA × 100</code>
      <div className="worked-example"><b>Worked example</b><span>12.6 g saturated fat / 100 g · 20 g serving · 11% printed RDA · 52 g packet</span><strong>Whole packet ≈ 29%</strong></div>
      <p className="decision-note">A signal appears only when the whole pack is at least 25% of the pack-derived reference and at least 1.5× its printed serving percentage. “Moderate” and “high” are presentation bands, not regulatory classifications.</p>
    </section>

    <section className="service-card">
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

    <section className="service-card">
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
    </section>

    <section className="service-card">
      <p className="eyebrow">Verified context</p>
      <h2>Rule packs supplied to Terra</h2>
      <ul className="source-list">{RULE_PACKS.map((rule) => <li key={rule.id}><div><b>{rule.title}</b><small>{rule.status} · accessed {rule.source.accessedDate}</small></div><a href={rule.source.url} target="_blank" rel="noreferrer">Source ↗</a></li>)}</ul>
      <p className="decision-note">The CCPA Greenwashing Guidelines apply to environmental claims. Front of Pack does not automatically label every “free-from” cosmetic claim as greenwashing. <a href="https://consumeraffairs.nic.in/latestnews/guidelines-prevention-and-regulation-greenwashing-or-misleading-environmental-claims-2024" target="_blank" rel="noreferrer">Official guidelines ↗</a></p>
    </section>
  </main>;
}
