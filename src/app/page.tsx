import UploadAnalyser from "./scan/upload-analyser";

const categories = [
  ["Food & drinks", "Nutrition, ingredients and pack claims"],
  ["Cosmetics", "Ingredients and label declarations"],
  ["Personal care", "Everyday product information"],
  ["Household", "Pack directions and cautions"],
  ["Baby care", "Clear, careful label reading"],
  ["Pet care", "Product details and directions"],
  ["Supplements", "Claims, ingredients and declarations"],
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Front of Pack home"><span className="brand-mark" aria-hidden="true">F</span><span>Front of Pack</span></a>
        <nav aria-label="Primary navigation"><a href="#how-it-works">How it works</a><a href="#coverage">What we cover</a><a className="nav-action" href="#upload">Check a label</a></nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Clear labels. Better choices.</p>
          <h1>Know what&apos;s really on the <em>front of your pack.</em></h1>
          <p className="hero-intro">Upload one photo. Understand up to six products with evidence-led guidance in the language you choose.</p>
          <div className="trust-row" aria-label="Service highlights"><span>12 Indian languages</span><span>Multiple product categories</span><span>Sources included</span></div>
        </div>

        <UploadAnalyser />
      </section>

      <section className="journey section" id="how-it-works" aria-labelledby="journey-title">
        <div className="section-heading"><p className="eyebrow">One photo, useful answers</p><h2 id="journey-title">From pack to plain language</h2><p>No jargon. No unexplained score. Just what the label shows, what reliable sources say, and what you can do next.</p></div>
        <ol className="steps">
          <li><span>01</span><div><h3>Share the pack</h3><p>Upload one clear image containing one product or a shelf of up to six.</p></div></li>
          <li><span>02</span><div><h3>We examine the evidence</h3><p>Label details are checked against relevant rules, registries and public sources.</p></div></li>
          <li><span>03</span><div><h3>Choose your next step</h3><p>Read a sourced explanation, check a registry, or prepare an editable grievance draft.</p></div></li>
        </ol>
      </section>

      <section className="coverage section" id="coverage" aria-labelledby="coverage-title">
        <div className="section-heading split-heading"><div><p className="eyebrow">Built for the everyday shelf</p><h2 id="coverage-title">More than food labels</h2></div><p>Coverage follows the evidence available for each category. We clearly say when only general pack guidance applies.</p></div>
        <ul className="category-grid">{categories.map(([name, detail], index) => <li key={name} className={index === 0 ? "featured-category" : ""}><span className="category-number">0{index + 1}</span><h3>{name}</h3><p>{detail}</p></li>)}</ul>
      </section>

      <section className="actions section" aria-labelledby="actions-title">
        <div className="action-intro"><p className="eyebrow light">Beyond an explanation</p><h2 id="actions-title">When you need to go further</h2><p>Useful official routes, without pretending to be the authority.</p></div>
        <div className="action-list">
          <article><span>01</span><div><h3><a href="/registry">Check a registry →</a></h3><p>Try an exact identifier against clearly synthetic demonstration data.</p></div></article>
          <article><span>02</span><div><h3><a href="/officer">Officer dashboard →</a></h3><p>Restricted, redacted aggregate analysis counts—never raw images or personal data.</p></div></article>
          <article><span>03</span><div><h3><a href="/grievance">Prepare a grievance →</a></h3><p>Create an editable draft from facts you confirm. Nothing is submitted for you.</p></div></article>
        </div>
      </section>

      <section className="whatsapp section" aria-labelledby="whatsapp-title">
        <div className="phone-preview" aria-hidden="true"><div className="phone-top"><span /><span /><span /></div><div className="message incoming">Send a clear photo of the product label.</div><div className="message outgoing">Photo attached</div><div className="message incoming lines"><i /><i /><i /></div></div>
        <div className="whatsapp-copy"><p className="eyebrow">Coming next · WhatsApp</p><h2 id="whatsapp-title">The same clear answer, right where you shop.</h2><p>Send a label photo on WhatsApp and receive the explanation in your saved language—no new app to learn.</p><span className="status-chip">Must-have channel in development</span></div>
      </section>

      <footer><div className="footer-brand"><span className="brand-mark" aria-hidden="true">F</span><strong>Front of Pack</strong></div><p>Front of Pack is an independent consumer information service. It is not affiliated with or endorsed by any government authority. Information is educational, not medical or legal advice.</p><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
