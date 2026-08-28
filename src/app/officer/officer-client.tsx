"use client";

import { FormEvent, useEffect, useState } from "react";
import type {
  AggregateRow,
  OfficerAnalysisCostRow,
  OfficerCostSummary,
} from "@/public-services";

interface OfficerDashboardResponse {
  rows: AggregateRow[];
  costSummary: OfficerCostSummary;
  recentAnalyses: OfficerAnalysisCostRow[];
  notice: string;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});
const integer = new Intl.NumberFormat("en-IN");

function formatUsdMicros(value: number | null): string {
  return value === null ? "—" : usd.format(value / 1_000_000);
}

function formatInteger(value: number | null): string {
  return value === null ? "—" : integer.format(value);
}

function formatTime(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? "—" : parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export default function OfficerClient() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<OfficerDashboardResponse | null>(null);

  async function loadDashboard(silent = false): Promise<boolean> {
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/officer/aggregates", { cache: "no-store" });
      if (!response.ok) {
        if (!silent) setMessage("Your officer session is unavailable. Please sign in again.");
        setDashboard(null);
        return false;
      }
      setDashboard(await response.json() as OfficerDashboardResponse);
      setMessage("");
      return true;
    } catch {
      if (!silent) setMessage("Dashboard data could not be loaded.");
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/officer/aggregates", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as OfficerDashboardResponse : null)
      .then((data) => { if (active && data) setDashboard(data); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function login(event: FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/officer/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(body.error ?? "Login failed.");
        return;
      }
      setPassword("");
      await loadDashboard(true);
    } catch {
      setMessage("Login could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  async function signOut(): Promise<void> {
    setLoading(true);
    try { await fetch("/api/officer/session", { method: "DELETE" }); } finally {
      setDashboard(null);
      setUsername("");
      setPassword("");
      setMessage("");
      setLoading(false);
    }
  }

  if (!dashboard) {
    return <div className="service-card officer-login-card">
      <form onSubmit={login}>
        <label>Demo user
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        </label>
        <label>Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Opening…" : "Open redacted dashboard"}
        </button>
      </form>
      <p className="officer-message" aria-live="polite">{message}</p>
    </div>;
  }

  const summary = dashboard.costSummary;
  return <div className="officer-dashboard">
    <div className="officer-toolbar">
      <p>{dashboard.notice}</p>
      <div>
        <button type="button" onClick={() => void loadDashboard()} disabled={loading}>Refresh</button>
        <button type="button" onClick={() => void signOut()} disabled={loading}>Sign out</button>
      </div>
    </div>

    <section aria-labelledby="spend-heading">
      <p className="eyebrow">Cost visibility</p>
      <h2 id="spend-heading">Estimated API spend</h2>
      <div className="officer-kpis">
        <article><small>Captured spend</small><strong>{formatUsdMicros(summary.totalCostUsdMicros)}</strong><span>Successful analyses with telemetry</span></article>
        <article><small>Average / image</small><strong>{formatUsdMicros(summary.averageCostUsdMicros)}</strong><span>One image, even with many products</span></article>
        <article><small>Cost coverage</small><strong>{summary.costedAnalyses} / {summary.completedAnalyses}</strong><span>Historical unknowns stay unpriced</span></article>
        <article><small>Measured tokens</small><strong>{formatInteger(summary.inputTokens + summary.outputTokens)}</strong><span>{formatInteger(summary.inputTokens)} in · {formatInteger(summary.outputTokens)} out</span></article>
        <article><small>Web searches</small><strong>{formatInteger(summary.webSearchCalls)}</strong><span>Exact hosted tool calls captured</span></article>
      </div>
      <div className="officer-cost-note">
        <strong>How this is calculated</strong>
        <p>OpenAI-reported input, cache-write, cached-input and output tokens, plus $0.01 for each hosted web-search call. A cache hit makes no new model call.</p>
        <p>This is a versioned estimate for successful responses—not an invoice. Cloudflare, storage, domain and WhatsApp charges are excluded.</p>
        <a href="https://developers.openai.com/api/docs/pricing" target="_blank" rel="noreferrer">Verify current OpenAI pricing ↗</a>
      </div>
    </section>

    <section aria-labelledby="run-costs-heading">
      <div className="officer-section-heading">
        <div><p className="eyebrow">Latest 50</p><h2 id="run-costs-heading">Cost by analyzed image</h2></div>
        <p>Rows are anonymous. “—” means cost telemetry was not recorded; it never means free.</p>
      </div>
      <div className="officer-table-wrap">
        <table className="officer-cost-table">
          <thead><tr><th>Run</th><th>Completed (UTC)</th><th>Status</th><th>Language</th><th>Input</th><th>Output</th><th>Searches</th><th>Latency</th><th>Estimated cost</th></tr></thead>
          <tbody>{dashboard.recentAnalyses.map((row, index) => <tr key={`${row.completedAt ?? "pending"}-${index}`}>
            <td>#{index + 1}</td>
            <td>{formatTime(row.completedAt)}</td>
            <td><span className={`officer-status officer-status-${row.status}`}>{row.status}</span></td>
            <td>{row.language.toUpperCase()}</td>
            <td><b>{formatInteger(row.inputTokens)}</b><small>{formatInteger(row.cachedInputTokens)} cached · {formatInteger(row.cacheWriteTokens)} write</small></td>
            <td><b>{formatInteger(row.outputTokens)}</b><small>{formatInteger(row.reasoningTokens)} reasoning</small></td>
            <td>{formatInteger(row.webSearchCalls)}</td>
            <td>{row.providerDurationMs === null ? "—" : `${(row.providerDurationMs / 1_000).toFixed(1)}s`}</td>
            <td><b>{formatUsdMicros(row.estimatedCostUsdMicros)}</b><small>{row.costBasisVersion ?? "not recorded"}</small></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>

    <section aria-labelledby="counts-heading">
      <h2 id="counts-heading">Analysis counts</h2>
      <div className="officer-table-wrap"><table><thead><tr><th>Status</th><th>Language</th><th>Count</th></tr></thead><tbody>{dashboard.rows.map((row, index) => <tr key={`${row.status}-${row.language}-${index}`}><td>{row.status}</td><td>{row.language.toUpperCase()}</td><td>{row.count}</td></tr>)}</tbody></table></div>
    </section>
    <p className="officer-message" aria-live="polite">{message}</p>
  </div>;
}
