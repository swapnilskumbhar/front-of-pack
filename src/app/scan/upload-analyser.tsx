"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AnalysisResult } from "@/domain/analysis";
import { buildShopperIndicators, formatProductIdentity, type ShopperIndicator } from "@/engine/presentation";
import { didAnyRuleBasedCheckRun, ratingBand } from "@/engine/rating";
import { DEFAULT_LANGUAGE, type LanguageCode } from "@/domain/language";
import { INTAKE_VERSION, MAX_IMAGE_BYTES, type CreatedAnalysisResponse, type SafeAnalysisResponse } from "@/intake";
import { DEMO_LABELS, DEMO_RESULTS } from "@/demo/results";

const LANGUAGE_STORAGE_KEY = "front-of-pack.language";
type DemoLabel = (typeof DEMO_LABELS)[number];
const languages: Array<[LanguageCode, string]> = [
  ["en", "English"], ["hi", "हिन्दी"], ["mr", "मराठी"], ["bn", "বাংলা"],
  ["ta", "தமிழ்"], ["te", "తెలుగు"], ["kn", "ಕನ್ನಡ"], ["gu", "ગુજરાતી"],
  ["ml", "മലയാളം"], ["pa", "ਪੰਜਾਬੀ"], ["or", "ଓଡ଼ିଆ"], ["ur", "اردو"],
];

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5" /></svg>;
}

function CameraIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h3l1.4-2h7.2l1.4 2h3a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="4" /></svg>;
}

export default function UploadAnalyser() {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
    return saved && languages.some(([code]) => code === saved) ? saved : DEFAULT_LANGUAGE;
  });
  const [fileName, setFileName] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedDemo, setSelectedDemo] = useState<DemoLabel | null>(null);
  const stopped = useRef(false);

  useEffect(() => {
    let active = true;
    const demoId = new URLSearchParams(window.location.search).get("demo");
    const demo = DEMO_LABELS.find((candidate) => candidate.id === demoId) ?? null;
    const demoTimer = window.setTimeout(() => {
      if (active && demo && DEMO_RESULTS[demo.id]) {
        setResult(DEMO_RESULTS[demo.id]);
        setSelectedDemo(demo);
        setMessage("Cached demonstration result — no model call was made.");
      }
    }, 0);
    void fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ preferredLanguage: LanguageCode }> : Promise.reject())
      .then((profile) => { if (active && languages.some(([code]) => code === profile.preferredLanguage)) setLanguage(profile.preferredLanguage); })
      .catch(() => { /* localStorage remains the offline fallback. */ });
    return () => { active = false; window.clearTimeout(demoTimer); stopped.current = true; };
  }, []);

  function changeLanguage(next: LanguageCode) {
    setLanguage(next);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    void fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredLanguage: next }),
    }).catch(() => { /* Keep the local fallback when profile storage is unavailable. */ });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    stopped.current = false;
    setMessage("");
    setResult(null);
    setSelectedDemo(null);
    const form = new FormData(event.currentTarget);
    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0) {
      setMessage("Choose a JPG, PNG or WebP image first.");
      return;
    }
    if (image.size > MAX_IMAGE_BYTES) {
      setMessage("The image must be 12 MB or smaller.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/analyses", {
        method: "POST",
        body: form,
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      const body = await readResponse(response);
      if (!response.ok) throw new Error(errorMessage(body));
      const analysis = body as CreatedAnalysisResponse;
      if (analysis.status === "complete" && analysis.result) {
        setResult(analysis.result);
        setPending(false);
        return;
      }
      setMessage("Analysing the label… This can take a little while.");
      await poll(analysis.id, analysis.accessToken);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Analysis could not be started.");
      setPending(false);
    }
  }

  async function poll(id: string, accessToken: string) {
    for (let attempt = 0; attempt < 90 && !stopped.current; attempt += 1) {
      await delay(2000);
      const response = await fetch(`/api/analyses/${encodeURIComponent(id)}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = await readResponse(response);
      if (!response.ok) throw new Error(errorMessage(body));
      const analysis = body as SafeAnalysisResponse;
      if (analysis.status === "complete" && analysis.result) {
        setResult(analysis.result);
        setMessage("");
        setPending(false);
        return;
      }
      if (analysis.status === "failed") throw new Error(failedAnalysisMessage(analysis.errorCode));
    }
    if (!stopped.current) throw new Error("The analysis is taking longer than expected. Please try again.");
  }

  return (
    <>
      <form className="upload-card" id="upload" onSubmit={submit}>
        <div className="card-heading"><div><p className="step-label">Start here</p><h2>Check a product label</h2></div><span className="private-pill">Temporary image</span></div>
        <label className="language-field"><span>Response language</span><select name="language" value={language} onChange={(event) => changeLanguage(event.target.value as LanguageCode)}>{languages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><small>Your choice is remembered for next time.</small></label>
        <label className="drop-zone"><input type="file" name="image" required accept="image/jpeg,image/png,image/webp" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /><span className="camera-icon"><CameraIcon /></span><strong>{fileName || "Take a photo or choose an image"}</strong><span>Show the label clearly · JPG, PNG or WebP · up to 12 MB</span></label>
        <button type="submit" className="primary-button" disabled={pending} aria-describedby="upload-note">{pending ? "Analysing…" : "Analyse label"} {!pending && <ArrowIcon />}</button>
        <p className="upload-note" id="upload-note">Your original image is validated, stored temporarily, then deleted after analysis.</p>
        <p className="analysis-message" aria-live="polite">{message}</p>
      </form>
      <div className="demo-row" aria-label="Cached demonstrations">
        <span>Try instantly:</span>
        {DEMO_LABELS.map((demo) => <button key={demo.id} type="button" onClick={() => {
          setResult(DEMO_RESULTS[demo.id]);
          setSelectedDemo(demo);
          setMessage("Cached demonstration result — no model call was made.");
          window.history.replaceState(null, "", `?demo=${demo.id}`);
        }}>{demo.imageSrc && <span className="demo-thumb" aria-hidden="true" style={{ backgroundImage: `url(${demo.imageSrc})`, backgroundSize: demo.id === "cart" ? "contain" : "cover", backgroundRepeat: "no-repeat" }} />}<strong>{demo.label}</strong><small>{demo.detail}</small></button>)}
      </div>
      {result && <AnalysisResultView result={result} demo={selectedDemo} />}
    </>
  );
}

function AnalysisResultView({ result, demo }: { result: AnalysisResult; demo: DemoLabel | null }) {
  return (
    <section className="analysis-result" aria-live="polite" aria-labelledby="analysis-result-title">
      <p className="eyebrow">Quick label check</p>
      <h2 id="analysis-result-title">Your shopper brief</h2>
      {demo?.imageSrc && <figure className="analysis-demo-input"><div className="analysis-demo-input-frame"><Image src={demo.imageSrc} alt={`${demo.label} cached demo input`} fill sizes="(max-width: 700px) 90vw, 440px" /></div><figcaption>Cached demo input · no model call on click</figcaption></figure>}
      <p className="analysis-result-summary">{result.wholeImageSummary}</p>
      <div className="analysis-result-stats"><span><b>{result.analyzedCount}</b> products analysed</span><span><b>{result.flaggedCount}</b> engine-flagged products</span><span><b>{result.unknownCount}</b> unknown products</span><span>{INTAKE_VERSION.prompt} · {INTAKE_VERSION.engine}</span></div>
      {result.truncated && <p className="analysis-truncated">The image contained more products than this result could include.</p>}
      <div className="analysis-items">{result.items.map((item) => {
        const decision = result.derived?.items.find((entry) => entry.position === item.position);
        const derivedSignals = decision?.signals ?? [];
        const rating = decision?.rating;
        const checksRan = didAnyRuleBasedCheckRun(item, derivedSignals);
        const indicators = buildShopperIndicators(item, derivedSignals, result.language);
        const ratingRows = rating?.deductions.map((deduction) => ({
          ...deduction,
          label: indicatorForDeduction(deduction.ruleId, indicators)?.title ?? "PUBLISHED RULE",
        })) ?? [];
        const warnings = indicators.filter((indicator) => indicator.tone === "red" || indicator.tone === "amber");
        const insufficient = warnings.length === 0
          ? indicators.filter((indicator) => indicator.tone === "grey").slice(0, 1)
          : [];
        const priorityIndicators = [...warnings, ...insufficient];
        const supporting = indicators.filter((indicator) =>
          indicator.tone === "green" || indicator.tone === "grey" && !insufficient.includes(indicator));
        const visibleClaims = item.claimsAsPrinted ?? [];
        const auditedVisibleClaims = visibleClaims.flatMap((claim) => {
          const audit = item.claimAudits.find((candidate) => candidate.claimAsPrinted === claim);
          return audit ? [{ claim, audit }] : [];
        });
        const packageEvidence = item.evidence.filter((evidence) => evidence.origin === "package");
        const onlineEvidence = item.evidence.filter((evidence) => evidence.origin === "hosted_web_search");
        return <article key={item.position}>
          <div className="analysis-item-heading">
            <span>Product {item.position}</span>
            <b>{categoryLabel(item.category)}</b>
          </div>
          <h3>{productName(item)}</h3>
          {priorityIndicators.length > 0 && <div className="shopper-indicators">{priorityIndicators.map((indicator, index) => <div className={`shopper-indicator signal-${indicator.tone}`} data-origin={indicator.origin} key={`${indicator.title}-${index}`}>
            <strong>{indicator.tone === "red" ? "●" : indicator.tone === "amber" ? "●" : indicator.tone === "green" ? "✓" : "—"} {indicator.title}</strong>
            <span>{indicator.detail}</span>
            {indicator.origin === "engine" && indicator.ruleId && <a className="indicator-rule-link" href={`/how-we-decide#${indicator.ruleId}`}>How this was decided →</a>}
          </div>)}<p className="indicator-legend">Red is reserved for a high engine rule. Amber is evidence-backed context. Grey means there is not enough information to rate.</p></div>}
          <div className="analysis-overview">
            <div className="rating-card"><small>Experimental rule-based rating</small><strong>{rating?.score === null || rating?.score === undefined ? ratingBand(null, checksRan) : `${rating.score}/10 · ${ratingBand(rating.score, checksRan)}`}</strong>{ratingRows.length ? <details><summary>{ratingArithmetic(rating?.score ?? null, ratingRows.map((deduction) => deduction.points))}</summary><ul>{ratingRows.map((deduction, index) => <li key={`${deduction.ruleId}-${index}`}>−{deduction.points}: {deduction.label}</li>)}</ul></details> : <span>{checksRan ? "Checks completed; no fixed deduction applied." : "Rating unavailable until a reproducible rule check can run."}</span>}</div>
            <div><small>Profile</small><strong>{item.profile?.length ? item.profile.map((tag) => tag.label).join(" · ") : "No reliable tags"}</strong></div>
            <div><small>{item.webResearchOutcome === "not_needed" ? "Image identification" : "Product match"}</small><strong>{productMatchConfidence(item)}</strong>{item.webMatchBasis && <span>{item.webMatchBasis}</span>}</div>
          </div>
          {item.summary && <p className="analysis-verdict"><strong>{strongestToneIcon(indicators)} Verdict</strong>{item.summary}</p>}
          {supporting.length > 0 && <div className="analysis-key-findings"><h4>Analysis</h4><ul>{supporting.map((indicator, index) => <li key={`${indicator.title}-${index}`}><strong>{indicator.title}</strong><span>{indicator.detail}</span>{indicator.origin === "engine" && indicator.ruleId && <a href={`/how-we-decide#${indicator.ruleId}`}>How decided →</a>}</li>)}</ul></div>}
          {auditedVisibleClaims.length > 0 && <div className="analysis-claims-section"><h4>Claims</h4>{auditedVisibleClaims.map(({ claim, audit }) => {
            const status = audit.status;
            const engineConfirmed = derivedSignals.some((signal) => signal.kind === "claim_contradiction" && signal.claimAsPrinted === claim);
            const engineClass = status === "contradicted" && engineConfirmed ? " claim-engine-contradicted" : "";
            const limitationFirst = status === "not_established" || status === "not_assessable";
            return <div className={`claim-status-${status}${engineClass}`} key={claim}><span>{claimStatusIcon(status, engineConfirmed)}</span><p>{limitationFirst ? <><strong>{audit.assessment}</strong><small>{claimStatusLabel(status, engineConfirmed)}</small><em>Printed claim: “{claim}”</em></> : <><strong>“{claim}”</strong><small>{claimStatusLabel(status, engineConfirmed)}</small>{audit.assessment && <em>{audit.assessment}</em>}</>}</p></div>;
          })}</div>}
          {item.serviceRoute && <div className="analysis-next-step-card"><small>Verified next step</small><p>{item.serviceRoute.reason}</p><a className="analysis-next-step" href="/grievance">Prepare an editable draft →</a></div>}
          <details className="analysis-evidence">
            <summary>View full evidence</summary>
            {item.findings.length > 0 && <div><h4>Findings</h4>{item.findings.map((finding) => <p key={finding.id}><strong>{finding.title}:</strong> {finding.explanation}</p>)}</div>}
            {packageEvidence.length > 0 && <div><h4>Read from the package</h4><ul>{packageEvidence.map((evidence) => <li key={evidence.id}>{evidence.excerptOrObservation}</li>)}</ul></div>}
            {onlineEvidence.length > 0 && <div><h4>Found online</h4><ul>{onlineEvidence.map((evidence) => <li key={evidence.id}>{evidence.excerptOrObservation}</li>)}</ul></div>}
            {item.citations.length > 0 && <div><h4>Matched sources</h4><ul>{item.citations.map((citation) => <li key={citation.id}><a href={citation.url} target="_blank" rel="noreferrer nofollow">{citation.title}</a></li>)}</ul></div>}
            {item.coverage.limitations.length > 0 && <div><h4>Limitations</h4><ul>{item.coverage.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></div>}
            <div><h4>Analysis versions</h4><p>{INTAKE_VERSION.model} · {INTAKE_VERSION.prompt} · {INTAKE_VERSION.schema} · {INTAKE_VERSION.rules} · {INTAKE_VERSION.engine}</p></div>
          </details>
        </article>;
      })}</div>
      <small className="analysis-disclaimer">{result.disclaimer}</small>
    </section>
  );
}

function productName(item: AnalysisResult["items"][number]): string {
  return formatProductIdentity(item.identity);
}

function productMatchConfidence(item: AnalysisResult["items"][number]): string {
  if (item.webMatchConfidence === "high") return "High";
  if (item.webMatchConfidence === "medium") return "Medium";
  if (item.webMatchConfidence === "low") return "Low";
  if (item.webResearchOutcome === "not_needed") {
    return item.identity.confidence.charAt(0).toUpperCase() + item.identity.confidence.slice(1);
  }
  return "Not established";
}

function strongestToneIcon(indicators: readonly ShopperIndicator[]): string {
  if (indicators.some((indicator) => indicator.tone === "red")) return "🔴";
  if (indicators.some((indicator) => indicator.tone === "amber")) return "🟠";
  if (indicators.some((indicator) => indicator.tone === "grey")) return "⚪";
  return "🟢";
}

function claimStatusIcon(status: AnalysisResult["items"][number]["claimAudits"][number]["status"], engineConfirmed: boolean): string {
  if (status === "supported") return "✓";
  if (status === "contradicted") return engineConfirmed ? "×" : "!";
  if (status === "partially_supported") return "!";
  return "—";
}

function claimStatusLabel(status: AnalysisResult["items"][number]["claimAudits"][number]["status"], engineConfirmed: boolean): string {
  if (status === "contradicted") return engineConfirmed ? "engine-confirmed contradiction" : "possible contradiction";
  return status.replaceAll("_", " ");
}

function categoryLabel(category: string): string {
  return category.replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function ratingArithmetic(score: number | null, points: number[]): string {
  if (score === null || points.length === 0) return "No reproducible score";
  const expression = `10 ${points.map((point) => `− ${point}`).join(" ")}`;
  return points.reduce((sum, point) => sum + point, 0) > 10
    ? `max(0, ${expression}) = ${score}`
    : `${expression} = ${score}`;
}

function indicatorForDeduction(ruleId: string, indicators: readonly ShopperIndicator[]): ShopperIndicator | undefined {
  const topic = ruleId.includes("added_sugars") ? "added_sugars"
    : ruleId.includes("saturated_fat") ? "saturated_fat"
      : ruleId.includes("sodium") ? "sodium"
        : ruleId.includes("total_fat") ? "total_fat"
          : /claim|advertising/iu.test(ruleId) ? "claim"
            : ruleId.includes("allergen") ? "allergen"
              : "diet";
  return indicators.find((indicator) => indicator.origin === "engine" && indicator.topic === topic);
}

async function readResponse(response: Response): Promise<unknown> {
  try { return await response.json(); } catch { return {}; }
}

function errorMessage(body: unknown): string {
  return typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
    ? body.error
    : "The request could not be completed.";
}

function failedAnalysisMessage(errorCode: string | null): string {
  if (errorCode === "terra_request_failed") {
    return "The analysis service was temporarily unavailable. Tap Analyse label to retry.";
  }
  if (errorCode === "analysis_processing_failed") {
    return "We could not validate that result. Tap Analyse label to retry.";
  }
  return "The analysis could not be completed. Tap Analyse label to retry.";
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
