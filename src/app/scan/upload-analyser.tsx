"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AnalysisResult } from "@/domain/analysis";
import { DEFAULT_LANGUAGE, type LanguageCode } from "@/domain/language";
import { MAX_IMAGE_BYTES, type CreatedAnalysisResponse, type SafeAnalysisResponse } from "@/intake";

const LANGUAGE_STORAGE_KEY = "front-of-pack.language";
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
  const stopped = useRef(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ preferredLanguage: LanguageCode }> : Promise.reject())
      .then((profile) => { if (active && languages.some(([code]) => code === profile.preferredLanguage)) setLanguage(profile.preferredLanguage); })
      .catch(() => { /* localStorage remains the offline fallback. */ });
    return () => { active = false; stopped.current = true; };
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
      {result && <AnalysisResultView result={result} />}
    </>
  );
}

function AnalysisResultView({ result }: { result: AnalysisResult }) {
  return (
    <section className="analysis-result" aria-live="polite" aria-labelledby="analysis-result-title">
      <p className="eyebrow">Quick label check</p>
      {result.strongestMaterialFinding && <p className="analysis-callout">{result.strongestMaterialFinding}</p>}
      <h2 id="analysis-result-title">{result.wholeImageSummary}</h2>
      <div className="analysis-items">{result.items.map((item) => {
        const visibleFindings = [...item.findings]
          .sort((left, right) => Number(right.level === "attention") - Number(left.level === "attention"))
          .slice(0, 3);
        const claimCheck = item.claimAudits.find((claim) => claim.status !== "supported") ?? item.claimAudits[0];
        return <article key={item.position}>
          <div className="analysis-item-heading">
            <span>Product {item.position}</span>
            <div className="analysis-badges"><b>{categoryLabel(item.category)}</b><b>{item.coverage.tier.replaceAll("_", " ")}</b></div>
          </div>
          {visibleFindings.length > 0 && <div className="analysis-key-findings">
            <h4>What matters</h4>
            <ul>{visibleFindings.map((finding) => <li key={finding.id}><strong>{finding.title}</strong><span>{finding.explanation}</span></li>)}</ul>
          </div>}
          <h3>{item.identity.nameAsPrinted || item.identity.brandAsPrinted || "Product identified from the image"}</h3>
          {claimCheck && <div className="analysis-claim"><small>Claim check</small><strong>{claimCheck.claimAsPrinted}</strong><p>{claimCheck.assessment}</p></div>}
          {item.needsClearerImage && item.retakeGuidance && <p className="analysis-retake">📷 {item.retakeGuidance}</p>}
          {item.serviceRoute && <a className="analysis-next-step" href="/grievance">See your next-step options →</a>}
          <details className="analysis-evidence">
            <summary>View full evidence</summary>
            {item.findings.length > visibleFindings.length && <div><h4>Additional findings</h4>{item.findings.slice(3).map((finding) => <p key={finding.id}><strong>{finding.title}:</strong> {finding.explanation}</p>)}</div>}
            {item.evidence.length > 0 && <div><h4>Evidence read</h4><ul>{item.evidence.map((evidence) => <li key={evidence.id}>{evidence.excerptOrObservation}</li>)}</ul></div>}
            {item.citations.length > 0 && <div><h4>Sources</h4><ul>{item.citations.map((citation) => <li key={citation.id}><a href={citation.url} target="_blank" rel="noreferrer nofollow">{citation.title}</a></li>)}</ul></div>}
            {item.coverage.limitations.length > 0 && <div><h4>Limitations</h4><ul>{item.coverage.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></div>}
          </details>
        </article>;
      })}</div>
      <small className="analysis-disclaimer">{result.disclaimer}</small>
    </section>
  );
}

function categoryLabel(category: string): string {
  return category.replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
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
