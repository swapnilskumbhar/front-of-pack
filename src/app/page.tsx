import UploadAnalyser from "./scan/upload-analyser";

const categories = [
  ["Nutrition reality", "Absolute values plus printed or clearly calculated %RDA, scoped to 100 g/ml, an exact serving, or the verified whole pack."],
  ["Diet and allergens", "Veg marks, allergens, dietary-source uncertainty and relevant ingredients—without inventing vegan, halal or safety certification."],
  ["Claims and evidence", "Visible package claims checked against label facts and sufficiently matched sources, with package and online provenance kept separate."],
  ["Citizen next steps", "Open decision logic, exact demonstration registry checks and an editable draft for an appropriate verified consumer-service route."],
];

const outputFeatures = [
  ["Every warning", "All independently useful warnings stay visible: nutrients, allergens, statutory cautions, ingredients and claim conflicts."],
  ["Absolute + %RDA", "See the amount and percentage together. Printed %RDA wins; calculated values are explicitly labelled and sourced."],
  ["Rating you can reproduce", "A fixed 10-point start and published deductions show exactly why the experimental score changed."],
  ["Full analysis", "Useful positives, ingredients, additives, diet signals and uncertainties follow the warnings without repeating them."],
  ["Visible-claim audit", "A Claims section appears only when the submitted image visibly contains a claim."],
  ["Evidence and action", "Inspect source match, citations, limitations, formulas and the verified next step when one applies."],
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Front of Pack home"><span className="brand-mark" aria-hidden="true">F</span><span>Front of Pack</span></a>
        <nav aria-label="Primary navigation"><a href="#how-it-works">How it works</a><a href="#what-you-get">What you get</a><a href="/how-we-decide">How we decide</a><a className="nav-action" href="#upload">Check a label</a></nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> India’s label rules, made useful at the shelf.</p>
          <h1>The label shows one serving. <em>See what the whole pack means.</em></h1>
          <p className="hero-intro">Upload one photo to see what matters across the whole pack—in your language.</p>
          <div className="trust-row" aria-label="Service highlights"><span>Whole-pack numbers</span><span>Warnings with reasons</span><span>Works on WhatsApp</span><span>See every rule</span></div>
        </div>

        <UploadAnalyser />
      </section>

      <section className="journey section" id="how-it-works" aria-labelledby="journey-title">
        <div className="section-heading"><p className="eyebrow">The public-service gap</p><h2 id="journey-title">Rules exist. Applying them while shopping is hard.</h2><p>Front of Pack turns FSSAI-style nutrition and label information into an evidence-backed citizen journey: understand, verify, then act.</p></div>
        <ol className="steps">
          <li><span>01</span><div><h3>Share the pack</h3><p>Upload one clear image containing one product or a shelf of up to six.</p></div></li>
          <li><span>02</span><div><h3>One response researches it</h3><p>Terra reads the photo and exact-product sources; the versioned engine calculates RDA, whole-pack, claim, diet and allergen signals.</p></div></li>
          <li><span>03</span><div><h3>See what matters</h3><p>Warnings come first. Rating arithmetic, claims, evidence and the next step remain one tap away.</p></div></li>
        </ol>
      </section>

      <section className="output-showcase section" id="what-you-get" aria-labelledby="output-title">
        <div className="section-heading split-heading"><div><p className="eyebrow">One response · complete picture</p><h2 id="output-title">Everything useful, without the wall of text</h2></div><p>Short, structured sections preserve breadth. Nothing material is hidden merely to keep the answer compact.</p></div>
        <div className="output-grid">{outputFeatures.map(([name, detail], index) => <article key={name}><span>0{index + 1}</span><h3>{name}</h3><p>{detail}</p></article>)}</div>
      </section>

      <section className="coverage section" id="coverage" aria-labelledby="coverage-title">
        <div className="section-heading split-heading"><div><p className="eyebrow">Current capabilities</p><h2 id="coverage-title">Four parts of a trustworthy decision</h2></div><p>Package facts remain primary. Online information is used only with an explicit product-match basis and retained citations.</p></div>
        <ul className="category-grid">{categories.map(([name, detail], index) => <li key={name} className={index === 0 ? "featured-category" : ""}><span className="category-number">0{index + 1}</span><h3>{name}</h3><p>{detail}</p></li>)}</ul>
      </section>

      <section className="actions section" aria-labelledby="actions-title">
        <div className="action-intro"><p className="eyebrow light">From evidence to action</p><h2 id="actions-title">Verify the decision or take the next step</h2><p>Inspect the calculation, check an identifier, or prepare facts for an official channel.</p></div>
        <div className="action-list">
          <article><span>01</span><div><h3><a href="/how-we-decide">Audit our decisions →</a></h3><p>See the RDA formulas, fixed rating deductions, claim tests and official sources.</p></div></article>
          <article><span>02</span><div><h3><a href="/registry">Look up an identifier →</a></h3><p>Try an FSSAI or BIS number against demonstration data.</p></div></article>
          <article><span>03</span><div><h3><a href="/grievance">Prepare confirmed facts →</a></h3><p>Create an editable draft for the appropriate official consumer service.</p></div></article>
        </div>
      </section>

      <section className="whatsapp section" aria-labelledby="whatsapp-title">
        <div className="phone-preview" aria-hidden="true"><div className="phone-top"><span /><span /><span /></div><div className="message outgoing">Product photo</div><div className="message incoming result-message"><b className="preview-red">🔴 HIGH ADDED SUGAR</b><span>31.5 g · ~63% whole-pack RDA</span><b className="preview-amber">🟠 SODIUM</b><span>678 mg · ~33.8% whole-pack RDA</span><small>Rating 5/10 · 10 − 3 − 2 · Evidence retained</small></div></div>
        <div className="whatsapp-copy"><p className="eyebrow">Live · WhatsApp</p><h2 id="whatsapp-title">The same useful answer, right where you shop.</h2><p>Send a photo immediately—English is the default. Choose another language once and future replies remember it.</p><span className="status-chip">Live channel · English by default · 12 languages</span></div>
      </section>
    </main>
  );
}
