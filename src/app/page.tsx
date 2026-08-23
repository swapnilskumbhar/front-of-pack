const categories = [
  ["Food & drinks", "Nutrition, ingredients and pack claims"],
  ["Cosmetics", "Ingredients and label declarations"],
  ["Personal care", "Everyday product information"],
  ["Household", "Pack directions and cautions"],
  ["Baby care", "Clear, careful label reading"],
  ["Pet care", "Product details and directions"],
  ["Supplements", "Claims, ingredients and declarations"],
];

const languages = ["English", "हिन्दी", "मराठी", "বাংলা", "தமிழ்", "తెలుగు", "ಕನ್ನಡ", "ગુજરાતી", "മലയാളം", "ਪੰਜਾਬੀ", "ଓଡ଼ିଆ", "اردو"];

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5" /></svg>;
}

function CameraIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h3l1.4-2h7.2l1.4 2h3a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="4" /></svg>;
}

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

        <form className="upload-card" id="upload">
          <div className="card-heading"><div><p className="step-label">Start here</p><h2>Check a product label</h2></div><span className="private-pill">Temporary image</span></div>
          <label className="language-field"><span>Response language</span><select name="language" defaultValue="English">{languages.map((language) => <option key={language}>{language}</option>)}</select><small>Your choice is remembered for next time.</small></label>
          <label className="drop-zone"><input type="file" name="label" accept="image/jpeg,image/png,image/webp" /><span className="camera-icon"><CameraIcon /></span><strong>Take a photo or choose an image</strong><span>Show the front label clearly · JPG, PNG or WebP</span></label>
          <button type="button" className="primary-button" aria-describedby="upload-note">Analyse label <ArrowIcon /></button>
          <p className="upload-note" id="upload-note">Your image is used only for this analysis and then removed.</p>
        </form>
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
          <article><span>01</span><div><h3>Check a registry</h3><p>Open the relevant official product or licence lookup when one is available.</p></div></article>
          <article><span>02</span><div><h3>Find the right office</h3><p>See the appropriate regulator or consumer support channel for the issue.</p></div></article>
          <article><span>03</span><div><h3>Prepare a grievance</h3><p>Create an editable draft from the facts you confirm. Nothing is submitted for you.</p></div></article>
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
