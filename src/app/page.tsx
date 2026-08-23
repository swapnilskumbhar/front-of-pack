import UploadAnalyser from "./scan/upload-analyser";

const categories = [
  ["Decision checks", "Food, beverages, cosmetics and personal care: whole-pack nutrition and literal claim contradictions when the required print is readable."],
  ["Pack-rule guidance", "Household, baby care, pet care and supplements: relevant declarations, directions and official service routes."],
  ["Plain-language reading", "Everything else: label comprehension without pretending that category-specific rules were applied."],
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Front of Pack home"><span className="brand-mark" aria-hidden="true">F</span><span>Front of Pack</span></a>
        <nav aria-label="Primary navigation"><a href="#how-it-works">How it works</a><a href="/how-we-decide">How we decide</a><a className="nav-action" href="#upload">Check a label</a></nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> India’s label rules, useful at the shelf.</p>
          <h1>The pack shows a serving. <em>You buy the whole pack.</em></h1>
          <p className="hero-intro">One photo turns fine print into whole-pack warnings, claim contradictions and official next steps—in your language.</p>
          <div className="trust-row" aria-label="Service highlights"><span>Whole-pack calculations</span><span>Live on WhatsApp</span><span>Open decision logic</span></div>
        </div>

        <UploadAnalyser />
      </section>

      <section className="journey section" id="how-it-works" aria-labelledby="journey-title">
        <div className="section-heading"><p className="eyebrow">The public-service gap</p><h2 id="journey-title">Rules exist. Applying them while shopping is hard.</h2><p>Front of Pack makes serving math, conflicting claims and the correct official route visible before the fine print wins.</p></div>
        <ol className="steps">
          <li><span>01</span><div><h3>Share the pack</h3><p>Upload one clear image containing one product or a shelf of up to six.</p></div></li>
          <li><span>02</span><div><h3>One AI call reads it</h3><p>Terra transcribes visible facts; a versioned engine performs reproducible checks.</p></div></li>
          <li><span>03</span><div><h3>See the decision first</h3><p>The most consequential warning appears before descriptions, evidence and next-step options.</p></div></li>
        </ol>
      </section>

      <section className="coverage section" id="coverage" aria-labelledby="coverage-title">
        <div className="section-heading split-heading"><div><p className="eyebrow">Honest coverage</p><h2 id="coverage-title">Three levels, clearly separated</h2></div><p>We show exactly whether a decision check, a pack rule, or plain-language reading was applied.</p></div>
        <ul className="category-grid">{categories.map(([name, detail], index) => <li key={name} className={index === 0 ? "featured-category" : ""}><span className="category-number">0{index + 1}</span><h3>{name}</h3><p>{detail}</p></li>)}</ul>
      </section>

      <section className="actions section" aria-labelledby="actions-title">
        <div className="action-intro"><p className="eyebrow light">From evidence to action</p><h2 id="actions-title">Verify the decision or take the next step</h2><p>Inspect the calculation, check an identifier, or prepare facts for an official channel.</p></div>
        <div className="action-list">
          <article><span>01</span><div><h3><a href="/how-we-decide">Audit our decisions →</a></h3><p>See every formula, threshold, literal claim test and official source.</p></div></article>
          <article><span>02</span><div><h3><a href="/registry">Look up an identifier →</a></h3><p>Try an FSSAI or BIS number against demonstration data.</p></div></article>
          <article><span>03</span><div><h3><a href="/grievance">Prepare confirmed facts →</a></h3><p>Create an editable draft for the appropriate official consumer service.</p></div></article>
        </div>
      </section>

      <section className="whatsapp section" aria-labelledby="whatsapp-title">
        <div className="phone-preview" aria-hidden="true"><div className="phone-top"><span /><span /><span /></div><div className="message incoming">Send a clear photo of the product label.</div><div className="message outgoing">Photo attached</div><div className="message incoming lines"><i /><i /><i /></div></div>
        <div className="whatsapp-copy"><p className="eyebrow">Live · WhatsApp</p><h2 id="whatsapp-title">The same decision, right where you shop.</h2><p>Send a label photo to the connected WhatsApp test channel and receive warning-first guidance in your saved language.</p><span className="status-chip">Live channel</span></div>
      </section>

      <footer><div className="footer-brand"><span className="brand-mark" aria-hidden="true">F</span><strong>Front of Pack</strong></div><p>Front of Pack is an independent consumer information service. It is not affiliated with or endorsed by any government authority. Information is educational, not medical or legal advice.</p><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
