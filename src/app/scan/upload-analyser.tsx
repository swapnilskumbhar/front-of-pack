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
    return () => { stopped.current = true; };
  }, []);

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
      if (analysis.status === "failed") throw new Error("The analysis failed. Please try again with a clear image.");
    }
    if (!stopped.current) throw new Error("The analysis is taking longer than expected. Please try again.");
  }

  return (
    <>
      <form className="upload-card" id="upload" onSubmit={submit}>
        <div className="card-heading"><div><p className="step-label">Start here</p><h2>Check a product label</h2></div><span className="private-pill">Temporary image</span></div>
        <label className="language-field"><span>Response language</span><select name="language" value={language} onChange={(event) => { const next = event.target.value as LanguageCode; setLanguage(next); localStorage.setItem(LANGUAGE_STORAGE_KEY, next); }}>{languages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><small>Your choice is remembered for next time.</small></label>
        <label className="drop-zone"><input type="file" name="image" required accept="image/jpeg,image/png,image/webp" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /><span className="camera-icon"><CameraIcon /></span><strong>{fileName || "Take a photo or choose an image"}</strong><span>Show the label clearly · JPG, PNG or WebP · up to 12 MB</span></label>
        <button type="submit" className="primary-button" disabled={pending} aria-describedby="upload-note">{pending ? "Analysing…" : "Analyse label"} {!pending && <ArrowIcon />}</button>
        <p className="upload-note" id="upload-note">Your image is stored temporarily for this analysis. Image normalization is pending.</p>
        <p className="analysis-message" aria-live="polite">{message}</p>
      </form>
      {result && <AnalysisResultView result={result} />}
    </>
  );
}

function AnalysisResultView({ result }: { result: AnalysisResult }) {
  return (
    <section className="analysis-result" aria-live="polite" aria-labelledby="analysis-result-title">
      <p className="eyebrow">Analysis complete</p>
      <h2 id="analysis-result-title">{result.wholeImageSummary}</h2>
      <p>{result.strongestMaterialFinding}</p>
      <div className="analysis-items">{result.items.map((item) => <article key={item.position}><span>Product {item.position}</span><h3>{item.identity.nameAsPrinted || item.identity.brandAsPrinted || "Product identified from the image"}</h3><p>{item.summary}</p>{item.findings.map((finding) => <div className="analysis-finding" key={finding.id}><strong>{finding.title}</strong><p>{finding.explanation}</p></div>)}</article>)}</div>
      <small>{result.disclaimer}</small>
    </section>
  );
}

async function readResponse(response: Response): Promise<unknown> {
  try { return await response.json(); } catch { return {}; }
}

function errorMessage(body: unknown): string {
  return typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
    ? body.error
    : "The request could not be completed.";
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
