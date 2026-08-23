"use client";
import { FormEvent, useState } from "react";

export default function RegistryClient() {
  const [identifier, setIdentifier] = useState(""); const [result, setResult] = useState<Record<string, unknown> | null>(null);
  async function lookup(event: FormEvent) { event.preventDefault(); setResult(await fetch(`/api/registry?identifier=${encodeURIComponent(identifier)}`).then((response) => response.json())); }
  return <form className="service-card" onSubmit={lookup}><label>Exact printed identifier<input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="10000000000001" /></label><button className="primary-button" type="submit">Check demo registry</button>{result && <pre className="service-output">{JSON.stringify(result, null, 2)}</pre>}</form>;
}
