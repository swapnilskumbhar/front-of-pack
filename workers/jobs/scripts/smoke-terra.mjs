import { readFileSync } from "node:fs";

import { callTerraOnce } from "../src/openai/client.ts";

const secretFileUrl = new URL("../.dev.vars", import.meta.url);
const secretFile = readFileSync(secretFileUrl, "utf8");

function readSecret(name) {
  const line = secretFile
    .split(/\r?\n/u)
    .find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  if (!line) throw new Error(`${name} is missing from workers/jobs/.dev.vars`);

  let value = line.slice(line.indexOf("=") + 1).trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1);
  }
  if (!value || value.includes("replace-with")) {
    throw new Error(`${name} still contains a placeholder`);
  }
  return value;
}

const result = await callTerraOnce(
  {
    OPENAI_API_KEY: readSecret("OPENAI_API_KEY"),
    MODEL_ANALYSIS: "gpt-5.6-terra",
    TERRA_REASONING_EFFORT: "low",
  },
  {
    imageUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    language: "en",
    verifiedRuleContext: [],
    verifiedServiceDirectory: [],
    enableWebSearch: false,
  },
);

console.log(
  JSON.stringify({
    responseId: result.responseId,
    language: result.result.language,
    analyzedCount: result.result.analyzedCount,
    webSearchUsed: result.webSearchUsed,
    usage: result.usage,
  }),
);
