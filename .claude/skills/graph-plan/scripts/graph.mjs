#!/usr/bin/env node
// Check a graph-plan tasks.json and print waves, the critical path and what is startable.
// Usage: node graph.mjs tasks.json [--json | --render graph.html]
//   --render writes the graph page from ../assets/task-graph-template.html with this data.
import { readFileSync, writeFileSync } from "node:fs";

const [file, flag, outPath] = process.argv.slice(2);
if (!file || (flag === "--render" && !outPath)) { console.error("usage: node graph.mjs tasks.json [--json | --render graph.html]"); process.exit(2); }
const data = JSON.parse(readFileSync(file, "utf8"));
const tasks = data.tasks;
const byId = Object.fromEntries(tasks.map(t => [t.id, t]));
const status = t => t.status || "todo";
const errors = [];

for (const t of tasks) {
  if (!data.milestones?.[t.milestone]) errors.push(`${t.id}: unknown milestone ${t.milestone}`);
  for (const d of t.deps) if (!byId[d]) errors.push(`${t.id}: unknown dep ${d}`);
  if (status(t) === "done" && t.deps.some(d => byId[d] && status(byId[d]) !== "done"))
    errors.push(`${t.id}: done but depends on unfinished ${t.deps.filter(d => status(byId[d]) !== "done").join(", ")}`);
}
if (tasks.length !== Object.keys(byId).length) errors.push("duplicate task ids");

// Wave = longest dependency chain below a task; detects cycles on the way.
const depth = {}, visiting = new Set();
const dOf = id => {
  if (id in depth) return depth[id];
  if (visiting.has(id)) { errors.push(`cycle through ${id}`); return 0; }
  visiting.add(id);
  const ds = byId[id].deps.filter(d => byId[d]);
  depth[id] = ds.length ? 1 + Math.max(...ds.map(dOf)) : 0;
  visiting.delete(id);
  return depth[id];
};
tasks.forEach(t => dOf(t.id));
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }

const waves = [];
tasks.forEach(t => (waves[depth[t.id]] ||= []).push(t.id));
const best = {};
const chain = id => best[id] ||= (() => {
  let b = [];
  for (const d of byId[id].deps) { const c = chain(d); if (c.length > b.length) b = c; }
  return [...b, id];
})();
let critical = [];
tasks.forEach(t => { const c = chain(t.id); if (c.length > critical.length) critical = c; });
const startable = tasks.filter(t => status(t) === "todo" && t.deps.every(d => status(byId[d]) === "done"));
const gates = tasks.filter(t => t.kind === "gate").map(g => ({
  id: g.id, waitsFor: g.deps, blocks: tasks.filter(t => t.deps.includes(g.id)).map(t => t.id),
}));

const out = {
  counts: Object.fromEntries(["todo", "running", "review", "done", "deferred"].map(s => [s, tasks.filter(t => status(t) === s).length])),
  waves, critical,
  startable: startable.map(t => ({ id: t.id, model: t.model, needsOwner: !!t.gate, name: t.name })),
  gates,
};
if (flag === "--render") {
  const tpl = readFileSync(new URL("../assets/task-graph-template.html", import.meta.url), "utf8");
  writeFileSync(outPath, tpl.replace("__TASKS_JSON__", () => JSON.stringify(data).replace(/</g, "\\u003c")));
  console.error(`wrote ${outPath}`);
}
if (flag === "--json") { console.log(JSON.stringify(out, null, 2)); process.exit(0); }

console.log(`${tasks.length} tasks: ${Object.entries(out.counts).filter(([, n]) => n).map(([s, n]) => `${n} ${s}`).join(", ")}`);
waves.forEach((w, i) => console.log(`wave ${i + 1}: ${w.join(" ")}`));
console.log(`critical path (${critical.length}): ${critical.join(" -> ")}`);
gates.forEach(g => console.log(`gate ${g.id}: waits for ${g.waitsFor.join(" ")}; blocks ${g.blocks.join(" ") || "nothing"}`));
console.log(startable.length ? "startable now:" : "startable now: none");
startable.forEach(t => console.log(`  ${t.id} (${t.model}${t.gate ? ", needs owner for outward step" : ""}) ${t.name}`));
