import assert from "node:assert/strict";
import test from "node:test";
import { parseWhatsAppLanguageSelection, persistAndEnqueueWhatsAppEvents } from "../src/channels/whatsapp/intake.ts";

class FakeStatement {
  values: unknown[] = [];
  private db: FakeDb;
  private sql: string;
  constructor(db: FakeDb, sql: string) { this.db = db; this.sql = sql; }
  bind(...values: unknown[]) { this.values = values; return this; }
  async first<T>() { return this.db.first(this.sql, this.values) as T | null; }
  async run() { this.db.run(this.sql, this.values); return { success: true, meta: { changes: 1 } }; }
}
class FakeDb {
  profile: { id: string; preferred_language: "en" | "mr" | "ur" } | null = null;
  jobs = new Map<string, { id: string; status: string; values: unknown[] }>();
  prepare(sql: string) { return new FakeStatement(this, sql); }
  first(sql: string, values: unknown[]) {
    if (sql.includes("FROM profile_identities")) return this.profile;
    if (sql.includes("FROM whatsapp_jobs")) {
      const job = this.jobs.get(String(values[0]));
      return job ? { id: job.id, status: job.status } : null;
    }
    return null;
  }
  run(sql: string, values: unknown[]) {
    if (sql.includes("INSERT OR IGNORE INTO profiles")) this.profile = { id: String(values[0]), preferred_language: "en" };
    if (sql.includes("UPDATE profiles SET preferred_language")) {
      if (this.profile) this.profile.preferred_language = values[0] as "en" | "mr" | "ur";
    }
    if (sql.includes("INSERT OR IGNORE INTO whatsapp_jobs")) {
      this.jobs.set(String(values[1]), { id: String(values[0]), status: "received", values });
    }
    if (sql.includes("UPDATE whatsapp_jobs SET status = 'queued'")) {
      for (const job of this.jobs.values()) if (job.id === values[0]) job.status = "queued";
    }
  }
}

test("durable image intake encrypts PII, queues only an id, and replay does not duplicate", async () => {
  const db = new FakeDb();
  const queued: unknown[] = [];
  const event = { kind: "image" as const, messageId: "wamid.1", sender: "919876543210",
    phoneNumberId: "phone", mediaId: "media-secret" };
  const bindings = {
    DB: db, ANALYSIS_QUEUE: { async send(value: unknown) { queued.push(value); } },
    PROFILE_HMAC_SECRET: "profile-secret",
    DELIVERY_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  };
  await persistAndEnqueueWhatsAppEvents([event], bindings);
  await persistAndEnqueueWhatsAppEvents([event], bindings);
  assert.equal(db.jobs.size, 1);
  assert.equal(queued.length, 1);
  assert.deepEqual(Object.keys(queued[0] as object).sort(), ["trigger", "version", "whatsapp_job_id"]);
  assert.doesNotMatch(JSON.stringify(queued), /919876543210|media-secret|wamid\.1/);
  const stored = db.jobs.get("wamid.1")!;
  assert.ok(stored.values[4] instanceof Uint8Array);
  assert.notEqual(new TextDecoder().decode(stored.values[4] as Uint8Array), event.sender);
});

test("status callbacks never enter the analysis queue", async () => {
  const queued: unknown[] = [];
  await persistAndEnqueueWhatsAppEvents([
    { kind: "status", messageId: "out.1", phoneNumberId: "phone", status: "delivered" },
  ], { DB: new FakeDb(), ANALYSIS_QUEUE: { async send(value: unknown) { queued.push(value); } },
    PROFILE_HMAC_SECRET: "secret", DELIVERY_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64") });
  assert.deepEqual(queued, []);
});

test("language commands support codes, English aliases and native names", () => {
  assert.equal(parseWhatsAppLanguageSelection("language: mr"), "mr");
  assert.equal(parseWhatsAppLanguageSelection("मराठी"), "mr");
  assert.equal(parseWhatsAppLanguageSelection("Urdu"), "ur");
  assert.equal(parseWhatsAppLanguageSelection("اردو"), "ur");
  assert.equal(parseWhatsAppLanguageSelection("analyse this"), null);
});

test("recognized WhatsApp text persists the profile language without queuing analysis", async () => {
  const db = new FakeDb();
  const queued: unknown[] = [];
  await persistAndEnqueueWhatsAppEvents([
    { kind: "text", messageId: "wamid.lang", sender: "919876543210", phoneNumberId: "phone", text: "मराठी" },
  ], { DB: db, ANALYSIS_QUEUE: { async send(value: unknown) { queued.push(value); } },
    PROFILE_HMAC_SECRET: "secret", DELIVERY_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64") });
  assert.equal(db.profile?.preferred_language, "mr");
  assert.deepEqual(queued, []);
});
