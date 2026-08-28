import type { Metadata } from "next";
import UploadAnalyser from "./scan/upload-analyser";
import { HOME_METADATA, WHATSAPP_URL } from "@/site-metadata";

export const metadata: Metadata = HOME_METADATA;

function WhatsAppIcon() {
  return <svg className="whatsapp-icon" viewBox="0 0 24 24" aria-hidden="true"><path className="whatsapp-icon-bubble" d="M12 2.5a9.5 9.5 0 0 0-8.1 14.46L2.75 21.3l4.45-1.1A9.5 9.5 0 1 0 12 2.5Z" /><path className="whatsapp-icon-phone" d="M8.1 7.5c.4-.5 1-.4 1.3.1l1 2c.2.4.1.8-.2 1.1l-.7.5c.8 1.5 1.9 2.6 3.4 3.3l.5-.7c.3-.4.7-.5 1.1-.3l2 1c.5.3.6.9.2 1.3-.8.9-1.9 1.2-3 .9-3.2-.8-5.7-3.3-6.5-6.5-.3-1 .1-2 1-2.7Z" /></svg>;
}

function DownArrowIcon() {
  return <svg className="down-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v15M6.5 13.5 12 19l5.5-5.5" /></svg>;
}

const categories = [
  ["Nutrition that adds up", "See sugar, sodium, fat and other useful values for one serving and the total quantity."],
  ["Ingredients that matter", "Spot allergens, vegetarian markings, additives and dietary-source uncertainty without guesswork."],
  ["Claims worth checking", "Compare visible marketing claims with the label and reliable information for the exact product."],
  ["Useful next steps", "Inspect the method, try an identifier lookup or prepare confirmed facts for an official service."],
];

const outputFeatures = [
  ["Warnings first", "Important nutrition, allergen, ingredient and claim concerns appear before supporting detail."],
  ["Values in context", "Compare one serving with the total quantity, using the label's own values whenever possible."],
  ["A rating you can inspect", "See each fixed deduction and the arithmetic behind the experimental rating."],
  ["Ingredients and diet", "Review allergens, additives, vegetarian markings and dietary-source uncertainty."],
  ["Visible claims checked", "Claims are assessed only when they can actually be seen in the submitted photo."],
  ["Evidence included", "Sources, limitations and useful next steps remain available without crowding the warnings."],
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Front of Pack home"><span className="brand-mark" aria-hidden="true">F</span><span>Front of Pack</span></a>
        <nav aria-label="Primary navigation"><a className="nav-action" href={WHATSAPP_URL} target="_blank" rel="noreferrer"><WhatsAppIcon /><span>WhatsApp</span></a></nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Required label information, made usable</p>
          <h1>Know what you’re buying. <em>See the facts that matter.</em></h1>
          <p className="hero-intro">Product labels carry information citizens need, but understanding it is still difficult. Send a photo on WhatsApp for clear nutrition, ingredient, allergen and claim warnings—with evidence.</p>
          <div className="hero-actions">
            <a className="whatsapp-primary" href={WHATSAPP_URL} target="_blank" rel="noreferrer"><WhatsAppIcon /><span>Send a product photo</span></a>
            <a className="web-secondary" href="#upload">Prefer the website? Upload here <DownArrowIcon /></a>
          </div>
          <div className="trust-row" aria-label="Service highlights"><span>Photos deleted after analysis</span><span>Exact-product web search</span><span>12 languages</span><span>Evidence included</span></div>
        </div>

        <UploadAnalyser />
      </section>

      <section className="journey section" id="how-it-works" aria-labelledby="journey-title">
        <div className="section-heading"><p className="eyebrow">The public-service gap</p><h2 id="journey-title">Disclosure exists. Understanding should not be the hard part.</h2><p>India’s labelling rules put important information on products. Front of Pack helps citizens interpret it at the moment of purchase without presenting itself as a government service.</p></div>
        <ol className="steps">
          <li><span>01</span><div><h3>Send a product photo</h3><p>Photograph the label clearly and share it through WhatsApp.</p></div></li>
          <li><span>02</span><div><h3>We read and search</h3><p>When needed, we search public web sources for reliable information about the exact product and keep it separate from what the photo shows.</p></div></li>
          <li><span>03</span><div><h3>Get the important facts</h3><p>Warnings come first, followed by useful context, evidence and honest limitations.</p></div></li>
        </ol>
      </section>

      <section className="output-showcase section" id="what-you-get" aria-labelledby="trust-title">
        <div className="section-heading split-heading"><div><p className="eyebrow">What the result includes</p><h2 id="trust-title">The important answers, shown first</h2></div><p>Every result stays concise without hiding useful warnings, evidence or uncertainty.</p></div>
        <div className="output-grid">{outputFeatures.map(([name, detail], index) => <article key={name}><span>0{index + 1}</span><h3>{name}</h3><p>{detail}</p></article>)}</div>
      </section>

      <section className="coverage section" id="coverage" aria-labelledby="coverage-title">
        <div className="section-heading split-heading"><div><p className="eyebrow">What we look for</p><h2 id="coverage-title">The label, translated into useful decisions</h2></div><p>The photo remains the starting point. Reliable product information is used only when the exact match is clear.</p></div>
        <ul className="category-grid">{categories.map(([name, detail], index) => <li key={name} className={index === 0 ? "featured-category" : ""}><span className="category-number">0{index + 1}</span><h3>{name}</h3><p>{detail}</p></li>)}</ul>
      </section>

      <section className="whatsapp section" aria-labelledby="whatsapp-title">
        <div className="phone-preview" aria-hidden="true"><div className="phone-top"><span /><span /><span /></div><div className="message outgoing">Product photo</div><div className="message incoming result-message"><b className="preview-red">🔴 HIGH ADDED SUGAR</b><span>31.5 g · ~63% daily reference for the bottle</span><b className="preview-amber">🟠 SODIUM</b><span>678 mg · ~33.8% daily reference for the bottle</span><small>Evidence and calculation included</small></div></div>
        <div className="whatsapp-copy"><p className="eyebrow">Live on WhatsApp</p><h2 id="whatsapp-title">Useful answers, right where you shop.</h2><p>Send a product photo immediately. English is the default; choose another language once and future replies remember it.</p><a className="status-chip" href={WHATSAPP_URL} target="_blank" rel="noreferrer"><WhatsAppIcon /> Send a product photo</a></div>
      </section>
    </main>
  );
}
