import { readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const policyPath = "data/website-update-policy.json";
const errors = [];

function fail(message) { errors.push(message); }
function isPlainObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function validIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
function repoPath(value) {
  if (typeof value !== "string" || !value || isAbsolute(value)) return false;
  const absolute = resolve(root, value);
  const rel = relative(root, absolute);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}
async function parseJson(path) {
  try { return JSON.parse(await readFile(resolve(root, path), "utf8")); }
  catch (error) { fail(`${path} does not parse as JSON: ${error.message}`); return null; }
}
async function exists(path) {
  try { return (await stat(resolve(root, path))).isFile(); }
  catch { return false; }
}

function validateSchema(value, schema, at = "policy") {
  if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) fail(`${at} must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) fail(`${at} is not an allowed value`);
  if (schema.type === "object") {
    if (!isPlainObject(value)) { fail(`${at} must be an object`); return; }
    for (const key of schema.required ?? []) if (!(key in value)) fail(`${at}.${key} is required`);
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!(key in (schema.properties ?? {}))) fail(`${at}.${key} is not allowed`);
    for (const [key, child] of Object.entries(schema.properties ?? {})) if (key in value) validateSchema(value[key], child, `${at}.${key}`);
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) { fail(`${at} must be an array`); return; }
    if (schema.minItems !== undefined && value.length < schema.minItems) fail(`${at} must contain at least ${schema.minItems} items`);
    if (schema.uniqueItems && new Set(value.map(JSON.stringify)).size !== value.length) fail(`${at} must contain unique items`);
    value.forEach((item, index) => validateSchema(item, schema.items ?? {}, `${at}[${index}]`));
  } else if (schema.type && typeof value !== schema.type) fail(`${at} must be a ${schema.type}`);
  if (schema.format === "date" && !validIsoDate(value)) fail(`${at} must be a valid ISO date`);
}

function argumentsFrom(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key !== "--human-voice" && key !== "--date") { fail(`Unknown argument: ${key}`); continue; }
    if (!argv[index + 1] || argv[index + 1].startsWith("--")) { fail(`Missing value for ${key}`); continue; }
    result[key.slice(2)] = argv[++index];
  }
  if ((result["human-voice"] && !result.date) || (!result["human-voice"] && result.date)) fail("--human-voice and --date must be supplied together");
  if (result.date && !validIsoDate(result.date)) fail("--date must be a valid ISO date");
  return result;
}

const args = argumentsFrom(process.argv.slice(2));
const policy = await parseJson(policyPath);
const schema = await parseJson("schemas/website-update-policy-v1.schema.json");
if (policy && schema) validateSchema(policy, schema);

if (policy) {
  for (const path of policy.declaredCanonicalFiles ?? []) {
    if (!repoPath(path)) fail(`Declared canonical path is not repository-relative: ${path}`);
    else if (!(await exists(path))) fail(`Declared canonical file does not exist: ${path}`);
  }
  for (const path of policy.requiredWebsiteTargets ?? []) {
    if (!repoPath(path)) fail(`Website target is not repository-relative: ${path}`);
    else if (!(await exists(path))) fail(`Required website target does not exist: ${path}`);
  }
}

const progress = await parseJson("data/progress.json");
if (progress) {
  if (!Array.isArray(progress.milestones)) fail("data/progress.json must contain a milestones array");
  else {
    let previousDate = null;
    const pairs = new Set();
    for (const [index, milestone] of progress.milestones.entries()) {
      if (!isPlainObject(milestone)) { fail(`milestones[${index}] must be an object`); continue; }
      if (!validIsoDate(milestone.date)) fail(`milestones[${index}].date must be a valid ISO date`);
      if (previousDate && milestone.date > previousDate) fail(`milestones are not newest first at index ${index}`);
      previousDate = milestone.date;
      const pair = `${milestone.date}\u0000${milestone.title}`;
      if (pairs.has(pair)) fail(`duplicate milestone date/title pair: ${milestone.date} / ${milestone.title}`);
      pairs.add(pair);
    }
  }
}

if (args["human-voice"] && args.date) {
  const targets = ["index.html", "human-voice/index.html", "progress.html"];
  for (const path of targets) {
    const html = await readFile(resolve(root, path), "utf8");
    if (!html.includes(args["human-voice"])) fail(`${path} does not contain the exact Human Voice text`);
    if (!html.includes(args.date)) fail(`${path} does not contain update date ${args.date}`);
  }
}

if (errors.length) {
  console.error(`Editorial validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Editorial policy ${policy?.policyVersion ?? "unknown"} and site structure validated${args["human-voice"] ? "; exact Human Voice verified" : ""}.`);
}
