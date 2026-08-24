import { decryptIdentifier } from "./crypto.ts";
import { GraphSendError, sendWhatsAppText, type GraphConfig } from "./graph.ts";
import { buildShopperIndicators, formatProductIdentity, type DerivedSignal } from "../../../../src/engine/index.ts";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type LanguageCode } from "../../../../src/domain/language.ts";
import type { ProductAnalysis } from "../../../../src/domain/analysis.ts";

export interface DeliveryJob { version: 1; whatsapp_job_id: string }
export interface DeliveryEnv extends GraphConfig {
  DB: D1Database;
  DELIVERY_ENCRYPTION_KEY: string;
}

const FAILURE_COPY: Record<string, string> = {
  en: "We couldn't verify this label reliably. Please resend the image or photograph the back panel clearly.",
  hi: "हम इस लेबल की विश्वसनीय जाँच नहीं कर सके। कृपया तस्वीर दोबारा भेजें या पीछे का पैनल साफ़ भेजें।",
  mr: "या लेबलची विश्वसनीय तपासणी झाली नाही. कृपया फोटो पुन्हा किंवा मागील पॅनल स्पष्ट पाठवा.",
  bn: "লেবেলটি নির্ভরযোগ্যভাবে যাচাই করা যায়নি। ছবিটি আবার বা পিছনের প্যানেলটি পরিষ্কার করে পাঠান।",
  ta: "இந்த லேபலை நம்பகமாகச் சரிபார்க்க முடியவில்லை. படத்தை மீண்டும் அல்லது பின்புறப் பலகையைத் தெளிவாக அனுப்பவும்.",
  te: "ఈ లేబుల్‌ను నమ్మకంగా ధృవీకరించలేకపోయాం. చిత్రాన్ని మళ్లీ లేదా వెనుక ప్యానెల్‌ను స్పష్టంగా పంపండి.",
  kn: "ಈ ಲೇಬಲ್ ಅನ್ನು ವಿಶ್ವಾಸಾರ್ಹವಾಗಿ ಪರಿಶೀಲಿಸಲಾಗಲಿಲ್ಲ. ಚಿತ್ರವನ್ನು ಮತ್ತೆ ಅಥವಾ ಹಿಂಭಾಗದ ಫಲಕವನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಕಳುಹಿಸಿ.",
  gu: "આ લેબલ વિશ્વસનીય રીતે ચકાસી શકાયું નથી. કૃપા કરીને તસવીર ફરી અથવા પાછળનું પેનલ સ્પષ્ટ મોકલો.",
  ml: "ഈ ലേബൽ വിശ്വസനീയമായി പരിശോധിക്കാനായില്ല. ചിത്രം വീണ്ടും അല്ലെങ്കിൽ പിൻ പാനൽ വ്യക്തമായി അയയ്ക്കുക.",
  pa: "ਇਸ ਲੇਬਲ ਦੀ ਭਰੋਸੇਯੋਗ ਜਾਂਚ ਨਹੀਂ ਹੋ ਸਕੀ। ਤਸਵੀਰ ਦੁਬਾਰਾ ਜਾਂ ਪਿਛਲਾ ਪੈਨਲ ਸਾਫ਼ ਭੇਜੋ।",
  or: "ଏହି ଲେବଲ୍‌କୁ ବିଶ୍ୱସନୀୟ ଭାବେ ଯାଞ୍ଚ କରିହେଲା ନାହିଁ। ଛବିଟି ପୁଣି କିମ୍ବା ପଛ ପ୍ୟାନେଲ୍ ସ୍ପଷ୍ଟ ପଠାନ୍ତୁ।",
  ur: "اس لیبل کی قابلِ اعتماد جانچ نہیں ہو سکی۔ تصویر دوبارہ یا پچھلا پینل واضح طور پر بھیجیں۔",
};

const RESPONSE_COPY: Record<LanguageCode, { rating: string; profile: string; verdict: string; analysis: string; claims: string; evidence: string }> = {
  en: { rating: "Rating", profile: "Profile", verdict: "Verdict", analysis: "Analysis", claims: "Claims", evidence: "Evidence confidence" },
  hi: { rating: "रेटिंग", profile: "प्रोफ़ाइल", verdict: "निष्कर्ष", analysis: "विश्लेषण", claims: "दावे", evidence: "साक्ष्य भरोसा" },
  mr: { rating: "रेटिंग", profile: "प्रोफाइल", verdict: "निष्कर्ष", analysis: "विश्लेषण", claims: "दावे", evidence: "पुरावा विश्वास" },
  bn: { rating: "রেটিং", profile: "প্রোফাইল", verdict: "সিদ্ধান্ত", analysis: "বিশ্লেষণ", claims: "দাবি", evidence: "প্রমাণের আস্থা" },
  ta: { rating: "மதிப்பீடு", profile: "சுயவிவரம்", verdict: "முடிவு", analysis: "பகுப்பாய்வு", claims: "கூற்றுகள்", evidence: "ஆதார நம்பிக்கை" },
  te: { rating: "రేటింగ్", profile: "ప్రొఫైల్", verdict: "తీర్పు", analysis: "విశ్లేషణ", claims: "క్లెయిమ్‌లు", evidence: "ఆధార నమ్మకం" },
  kn: { rating: "ರೇಟಿಂಗ್", profile: "ಪ್ರೊಫೈಲ್", verdict: "ತೀರ್ಮಾನ", analysis: "ವಿಶ್ಲೇಷಣೆ", claims: "ಹೇಳಿಕೆಗಳು", evidence: "ಸಾಕ್ಷ್ಯ ವಿಶ್ವಾಸ" },
  gu: { rating: "રેટિંગ", profile: "પ્રોફાઇલ", verdict: "નિષ્કર્ષ", analysis: "વિશ્લેષણ", claims: "દાવા", evidence: "પુરાવાનો વિશ્વાસ" },
  ml: { rating: "റേറ്റിംഗ്", profile: "പ്രൊഫൈൽ", verdict: "നിഗമനം", analysis: "വിശകലനം", claims: "അവകാശവാദങ്ങൾ", evidence: "തെളിവ് വിശ്വാസം" },
  pa: { rating: "ਰੇਟਿੰਗ", profile: "ਪ੍ਰੋਫਾਈਲ", verdict: "ਨਤੀਜਾ", analysis: "ਵਿਸ਼ਲੇਸ਼ਣ", claims: "ਦਾਅਵੇ", evidence: "ਸਬੂਤ ਭਰੋਸਾ" },
  or: { rating: "ରେଟିଂ", profile: "ପ୍ରୋଫାଇଲ୍", verdict: "ନିଷ୍କର୍ଷ", analysis: "ବିଶ୍ଳେଷଣ", claims: "ଦାବି", evidence: "ପ୍ରମାଣ ଭରସା" },
  ur: { rating: "ریٹنگ", profile: "پروفائل", verdict: "نتیجہ", analysis: "تجزیہ", claims: "دعوے", evidence: "ثبوت کا اعتماد" },
};

const CONFIDENCE_COPY: Record<LanguageCode, Record<"high" | "medium" | "low", string>> = {
  en: { high: "high", medium: "medium", low: "low" },
  hi: { high: "उच्च", medium: "मध्यम", low: "कम" },
  mr: { high: "उच्च", medium: "मध्यम", low: "कमी" },
  bn: { high: "উচ্চ", medium: "মাঝারি", low: "কম" },
  ta: { high: "உயர்", medium: "நடுத்தரம்", low: "குறைவு" },
  te: { high: "అధిక", medium: "మధ్యస్థ", low: "తక్కువ" },
  kn: { high: "ಹೆಚ್ಚು", medium: "ಮಧ್ಯಮ", low: "ಕಡಿಮೆ" },
  gu: { high: "ઊંચો", medium: "મધ્યમ", low: "ઓછો" },
  ml: { high: "ഉയർന്ന", medium: "ഇടത്തരം", low: "കുറവ്" },
  pa: { high: "ਉੱਚਾ", medium: "ਦਰਮਿਆਨਾ", low: "ਘੱਟ" },
  or: { high: "ଉଚ୍ଚ", medium: "ମଧ୍ୟମ", low: "କମ" },
  ur: { high: "زیادہ", medium: "درمیانہ", low: "کم" },
};

export function parseDeliveryJob(value: unknown): DeliveryJob | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return row.version === 1 && typeof row.whatsapp_job_id === "string" && row.whatsapp_job_id.length > 0 &&
    Object.keys(row).every((key) => key === "version" || key === "whatsapp_job_id")
    ? row as unknown as DeliveryJob : null;
}

interface WhatsAppProductBlock {
  icon: "⚠️" | "📦";
  ordinal: number;
  total: number;
  name: string;
  rows: string[];
}

const PRODUCT_BLOCK_FOOTER = "╰────────────────────";

export function renderWhatsAppChunks(result: unknown): string[] {
  const source = result && typeof result === "object" ? result as Record<string, unknown> : {};
  const warningSections: string[] = [];
  const detailSections: string[] = [];
  const warningBlocks: WhatsAppProductBlock[] = [];
  const detailBlocks: WhatsAppProductBlock[] = [];
  const requestedLanguage = typeof source.language === "string" ? source.language : null;
  const language = requestedLanguage && (SUPPORTED_LANGUAGES as readonly string[]).includes(requestedLanguage)
    ? requestedLanguage as LanguageCode
    : DEFAULT_LANGUAGE;
  const derived = source.derived && typeof source.derived === "object" ? source.derived as Record<string, unknown> : {};
  const derivedItems = Array.isArray(derived.items) ? derived.items : [];
  const sourceItems = Array.isArray(source.items) ? source.items : [];
  const validItems = sourceItems.filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"));
  const multipleProducts = validItems.length > 1;
  if (validItems.length) {
    for (const [itemIndex, value] of validItems.entries()) {
      const item = value as Record<string, unknown>;
      const ordinal = itemIndex + 1;
      const identity = item.identity && typeof item.identity === "object"
        ? item.identity as Record<string, unknown> : {};
      const name = formatProductIdentity(identity as unknown as ProductAnalysis["identity"]);
      const derivedItem = derivedItems.find((candidate) => candidate && typeof candidate === "object" &&
        (candidate as Record<string, unknown>).position === item.position) as Record<string, unknown> | undefined;
      const signals = Array.isArray(derivedItem?.signals) ? derivedItem.signals as DerivedSignal[] : [];
      const typedItem = item as unknown as ProductAnalysis;
      const indicators = buildShopperIndicators(typedItem, signals, language);
      const warnings = indicators.filter((indicator) => indicator.tone === "red" || indicator.tone === "amber");
      const supporting = indicators.filter((indicator) => indicator.tone === "green" || indicator.tone === "grey");
      const warningRows = warnings.map((indicator) => {
        const icon = indicator.tone === "red" ? "🔴" : indicator.tone === "amber" ? "🟠" : indicator.tone === "green" ? "🟢" : "⚪";
        return `${icon} *${indicator.title}*\n${indicator.detail}`;
      });
      if (multipleProducts && warningRows.length) {
        warningBlocks.push({ icon: "⚠️", ordinal, total: validItems.length, name, rows: warningRows });
      } else {
        warningSections.push(...warningRows);
      }
      const copy = RESPONSE_COPY[language] ?? RESPONSE_COPY.en;
      const rating = derivedItem?.rating && typeof derivedItem.rating === "object" ? derivedItem.rating as Record<string, unknown> : {};
      const score = typeof rating.score === "number" ? rating.score : null;
      const deductions = Array.isArray(rating.deductions) ? rating.deductions.filter((entry) => entry && typeof entry === "object") as Array<Record<string, unknown>> : [];
      const points = deductions.flatMap((deduction) => typeof deduction.points === "number" ? [deduction.points] : []);
      const deductionTotal = points.reduce((sum, point) => sum + point, 0);
      const expression = `10 ${points.map((point) => `− ${point}`).join(" ")}`;
      const arithmetic = score !== null && points.length
        ? ` · ${deductionTotal > 10 ? `max(0, ${expression})` : expression} = ${score}`
        : "";
      const profile = Array.isArray(item.profile) ? item.profile.flatMap((tag) => tag && typeof tag === "object" && typeof (tag as Record<string, unknown>).label === "string" ? [(tag as Record<string, unknown>).label as string] : []) : [];
      const summary = typeof item.summary === "string" ? item.summary.trim() : "";
      const meta = [
        !multipleProducts && name ? `📦 *${name}*` : null,
        `*${copy.rating}:* ${score ?? "—"}/10${arithmetic}`,
        profile.length ? `*${copy.profile}:* ${profile.join(" · ")}` : null,
        summary ? `*${copy.verdict}:* ${summary}` : null,
        `*${copy.evidence}:* ${CONFIDENCE_COPY[language][evidenceConfidence(item)]}`,
      ].filter((line): line is string => Boolean(line));
      const productDetailRows = [meta.join("\n")];
      if (supporting.length) {
        productDetailRows.push(`*${copy.analysis}:*\n${supporting.map((indicator) => `• *${indicator.title}:* ${indicator.detail}`).join("\n")}`);
      }
      const visibleClaims = Array.isArray(item.claimsAsPrinted)
        ? item.claimsAsPrinted.filter((claim): claim is string => typeof claim === "string" && claim.trim().length > 0)
        : [];
      const claimAudits = Array.isArray(item.claimAudits)
        ? item.claimAudits.filter((audit): audit is Record<string, unknown> => Boolean(audit && typeof audit === "object"))
        : [];
      if (visibleClaims.length) {
        const rows = visibleClaims.map((claim) => {
          const audit = claimAudits.find((candidate) => candidate.claimAsPrinted === claim);
          const status = typeof audit?.status === "string" ? audit.status : "not_assessable";
          const engineConfirmed = signals.some((signal) => signal.kind === "claim_contradiction" && signal.claimAsPrinted === claim);
          const icon = status === "supported" ? "✅" : status === "contradicted" && engineConfirmed ? "❌" : status === "contradicted" || status === "partially_supported" ? "⚠️" : "➖";
          const assessment = typeof audit?.assessment === "string" ? ` — ${audit.assessment}` : "";
          return `${icon} “${claim}”${assessment}`;
        });
        productDetailRows.push(`*${copy.claims}:*\n${rows.join("\n")}`);
      }
      const serviceRoute = item.serviceRoute && typeof item.serviceRoute === "object" ? item.serviceRoute as Record<string, unknown> : null;
      if (serviceRoute && typeof serviceRoute.reason === "string") productDetailRows.push(`🏛️ ${serviceRoute.reason}`);
      if (multipleProducts) {
        detailBlocks.push({ icon: "📦", ordinal, total: validItems.length, name, rows: productDetailRows });
      } else {
        detailSections.push(...productDetailRows);
      }
    }
  }
  if (multipleProducts) return packWhatsAppProductBlocks([...warningBlocks, ...detailBlocks], 3_500);
  const sections = [...warningSections, ...detailSections];
  if (sections.length === 0 && typeof source.wholeImageSummary === "string") sections.push(source.wholeImageSummary);
  if (sections.length === 0 && typeof source.summary === "string") sections.push(source.summary);
  return packWhatsAppSections(sections.length ? sections : ["Your label analysis is ready."], 3_500);
}

function packWhatsAppProductBlocks(blocks: readonly WhatsAppProductBlock[], maximumCodePoints: number): string[] {
  const closedSections: string[] = [];
  for (const block of blocks) {
    let rows: string[] = [];
    let continued = false;
    for (const row of block.rows) {
      for (const piece of splitProductBlockRow(row, block, maximumCodePoints)) {
        const candidate = renderProductBlock(block, [...rows, piece], continued);
        if (rows.length && Array.from(candidate).length > maximumCodePoints) {
          closedSections.push(renderProductBlock(block, rows, continued));
          rows = [piece];
          continued = true;
        } else {
          rows.push(piece);
        }
      }
    }
    if (rows.length) closedSections.push(renderProductBlock(block, rows, continued));
  }
  return packWhatsAppSections(closedSections, maximumCodePoints);
}

function splitProductBlockRow(row: string, block: WhatsAppProductBlock, maximumCodePoints: number): string[] {
  const emptyBlockLength = Array.from(renderProductBlock(block, [""], true)).length;
  const budget = Math.max(1, maximumCodePoints - emptyBlockLength);
  const codePoints = Array.from(row);
  const pieces: string[] = [];
  for (let offset = 0; offset < codePoints.length; offset += budget) {
    pieces.push(codePoints.slice(offset, offset + budget).join(""));
  }
  return pieces.length ? pieces : [""];
}

function renderProductBlock(block: WhatsAppProductBlock, rows: readonly string[], continued: boolean): string {
  const continuation = continued ? " · ↪" : "";
  const header = `╭─ ${block.icon} *${block.ordinal}/${block.total} · ${block.name}${continuation}*`;
  return [header, ...rows, PRODUCT_BLOCK_FOOTER].join("\n\n");
}

function packWhatsAppSections(sections: readonly string[], maximumCodePoints: number): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const section of sections) {
    let remaining = section.trim();
    if (!remaining) continue;
    const candidate = current ? `${current}\n\n${remaining}` : remaining;
    if (Array.from(candidate).length <= maximumCodePoints) {
      current = candidate;
      continue;
    }
    if (current) {
      chunks.push(current);
      current = "";
    }
    while (Array.from(remaining).length > maximumCodePoints) {
      const codePoints = Array.from(remaining);
      chunks.push(codePoints.slice(0, maximumCodePoints).join(""));
      remaining = codePoints.slice(maximumCodePoints).join("").trimStart();
    }
    current = remaining;
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : ["Your label analysis is ready."];
}

function evidenceConfidence(item: Record<string, unknown>): "high" | "medium" | "low" {
  const identity = item.identity && typeof item.identity === "object" ? item.identity as Record<string, unknown> : {};
  const identityConfidence = typeof identity.confidence === "string" ? identity.confidence : "unknown";
  const webConfidence = typeof item.webMatchConfidence === "string" ? item.webMatchConfidence : null;
  if (identityConfidence === "high" && (webConfidence === null || webConfidence === "high")) return "high";
  if (["high", "medium"].includes(identityConfidence) && webConfidence !== "low") return "medium";
  return "low";
}

export async function consumeDelivery(
  message: Pick<Message<unknown>, "body" | "ack"> & Partial<Pick<Message<unknown>, "retry">>,
  env: DeliveryEnv, fetcher: typeof fetch = fetch,
): Promise<void> {
  const job = parseDeliveryJob(message.body);
  if (!job) throw new Error("invalid_delivery_job");
  const row = await env.DB.prepare(`
    SELECT w.inbound_message_id, w.recipient_ciphertext, w.recipient_nonce, w.status, w.send_attempts, w.expires_at, a.result_json
    FROM whatsapp_jobs w JOIN scan_requests s ON s.id = w.scan_request_id
    JOIN analyses a ON a.id = s.analysis_id WHERE w.id = ? LIMIT 1
  `).bind(job.whatsapp_job_id).first<{
    inbound_message_id: string; recipient_ciphertext: ArrayBuffer | null; recipient_nonce: ArrayBuffer | null;
    status: string; send_attempts: number; expires_at: string; result_json: string | null;
  }>();
  if (!row || row.status === "sent" || row.status === "processing" || row.status === "failed") { message.ack(); return; }
  if (Date.parse(row.expires_at) <= Date.now()) {
    await clearWhatsAppCiphertext(env.DB, job.whatsapp_job_id, "delivery_expired");
    message.ack();
    return;
  }
  if (row.status !== "ready") { message.ack(); return; }
  const claim = await env.DB.prepare(`UPDATE whatsapp_jobs SET status = 'processing', send_attempts = send_attempts + 1,
    last_error_code = NULL WHERE id = ? AND status = 'ready' AND send_attempts < 3 AND expires_at > ?`)
    .bind(job.whatsapp_job_id, new Date().toISOString()).run();
  if ((claim.meta?.changes ?? 0) !== 1) { message.ack(); return; }
  if (!row.recipient_ciphertext || !row.recipient_nonce || !row.result_json) {
    await clearWhatsAppCiphertext(env.DB, job.whatsapp_job_id, "delivery_state_missing");
    message.ack(); return;
  }
  let sentChunks = 0;
  try {
    const recipient = await decryptIdentifier(row.recipient_ciphertext, row.recipient_nonce, env.DELIVERY_ENCRYPTION_KEY);
    for (const chunk of renderWhatsAppChunks(JSON.parse(row.result_json))) {
      await sendWhatsAppText(recipient, chunk, env, fetcher, { replyToMessageId: row.inbound_message_id });
      sentChunks += 1;
    }
  } catch (error) {
    if (sentChunks > 0) {
      await clearWhatsAppCiphertext(env.DB, job.whatsapp_job_id, "delivery_partial");
      message.ack();
      return;
    }
    if (error instanceof GraphSendError && error.retryable) {
      await env.DB.prepare(`UPDATE whatsapp_jobs SET status = CASE WHEN send_attempts < 3 THEN 'ready' ELSE 'failed' END,
        last_error_code = ?, completed_at = CASE WHEN send_attempts < 3 THEN NULL ELSE ? END,
        recipient_ciphertext = CASE WHEN send_attempts < 3 THEN recipient_ciphertext ELSE NULL END,
        recipient_nonce = CASE WHEN send_attempts < 3 THEN recipient_nonce ELSE NULL END,
        media_id_ciphertext = CASE WHEN send_attempts < 3 THEN media_id_ciphertext ELSE NULL END,
        media_id_nonce = CASE WHEN send_attempts < 3 THEN media_id_nonce ELSE NULL END
        WHERE id = ? AND status = 'processing'`)
        .bind(error.message, new Date().toISOString(), job.whatsapp_job_id).run();
      if (row.send_attempts + 1 < 3) {
        if (message.retry) message.retry({ delaySeconds: 30 });
        else throw error;
      } else {
        message.ack();
      }
      return;
    }
    await clearWhatsAppCiphertext(env.DB, job.whatsapp_job_id,
      error instanceof GraphSendError ? error.message : "delivery_ambiguous");
    message.ack(); return;
  }
  await env.DB.prepare(`UPDATE whatsapp_jobs SET status = 'sent', completed_at = ?, recipient_ciphertext = NULL,
    recipient_nonce = NULL, media_id_ciphertext = NULL, media_id_nonce = NULL WHERE id = ? AND status = 'processing'`)
    .bind(new Date().toISOString(), job.whatsapp_job_id).run();
  message.ack();
}

export async function sendWhatsAppAnalysisFailure(
  jobId: string,
  env: DeliveryEnv,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const row = await env.DB.prepare(`SELECT inbound_message_id, recipient_ciphertext, recipient_nonce, language
    FROM whatsapp_jobs WHERE id = ? LIMIT 1`).bind(jobId).first<{
      inbound_message_id: string; recipient_ciphertext: ArrayBuffer | null; recipient_nonce: ArrayBuffer | null; language: string;
    }>();
  if (!row?.recipient_ciphertext || !row.recipient_nonce) return;
  try {
    const recipient = await decryptIdentifier(row.recipient_ciphertext, row.recipient_nonce, env.DELIVERY_ENCRYPTION_KEY);
    await sendWhatsAppText(recipient, FAILURE_COPY[row.language] ?? FAILURE_COPY[DEFAULT_LANGUAGE], env, fetcher,
      { replyToMessageId: row.inbound_message_id });
  } catch {
    // The analysis is already terminal. Never retry it merely because the failure notice could not be sent.
  }
}

export async function clearWhatsAppCiphertext(db: D1Database, jobId: string, code: string): Promise<void> {
  await db.prepare(`UPDATE whatsapp_jobs SET status = 'failed', last_error_code = ?, completed_at = ?,
    recipient_ciphertext = NULL, recipient_nonce = NULL, media_id_ciphertext = NULL, media_id_nonce = NULL
    WHERE id = ? AND status NOT IN ('sent','failed')`).bind(code, new Date().toISOString(), jobId).run();
}

export async function cleanupExpiredWhatsAppJobs(db: D1Database): Promise<void> {
  await db.prepare(`UPDATE whatsapp_jobs SET status = 'failed', last_error_code = 'job_expired', completed_at = ?,
    recipient_ciphertext = NULL, recipient_nonce = NULL, media_id_ciphertext = NULL, media_id_nonce = NULL
    WHERE expires_at <= ? AND status NOT IN ('sent','failed')`)
    .bind(new Date().toISOString(), new Date().toISOString()).run();
}
