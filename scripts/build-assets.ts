/**
 * Draws the artwork for the profile README as self-contained SVGs: system-free
 * typography (the site's fonts are subset and embedded as data URIs), no
 * scripts, no external requests — the only kind GitHub renders in a README.
 *
 *   assets/banner-{light,dark}.svg     MEHBOOB⏎ typed on keycaps, one key pressed at a time
 *   assets/stack-{light,dark}.svg      the toolkit board, four rows of icon keycaps
 *   assets/outcomes-{light,dark}.svg   five numbers I'm accountable for
 *   assets/ideas-{light,dark}.svg      the "Five ideas I keep coming back to" grid
 *   assets/key-*.svg                   single keycaps used as glyphs in the side-project table
 *
 *   bun run build
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as si from "simple-icons";
import subsetFont from "subset-font";

/* ── palette (mirrors mehboobshaikh.com) ─────────────────────────────────── */
const theme = {
  light: { bg: "#f3efe6", surface: "#fbf9f4", ink: "#17150f", ink2: "#4a463d", muted: "#6b665a", line: "rgba(23,21,15,0.14)", enter: "#17150f", enterLegend: "#f2b544", quoteBg: "#17150f", quoteInk: "#f1ece2", quoteMuted: "#8d877a" },
  dark: { bg: "#121110", surface: "#1a1816", ink: "#f1ece2", ink2: "#c9c2b4", muted: "#8d877a", line: "rgba(241,236,226,0.14)", enter: "#f1ece2", enterLegend: "#17150f", quoteBg: "#f1ece2", quoteInk: "#17150f", quoteMuted: "#6b665a" },
};
type Theme = keyof typeof theme;
const ACCENT = "#f2b544";

const SANS = `'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif`;
const SERIF = `'Instrument Serif', Georgia, 'Times New Roman', serif`;
const MONO = `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace`;

/* ── fonts: subset to the glyphs each SVG uses, then inline ──────────────── */
const fontFiles = {
  sans: readFileSync("fonts/bricolage-grotesque-latin.woff2"),
  serif: readFileSync("fonts/instrument-serif-italic-latin.woff2"),
  mono: readFileSync("fonts/jetbrains-mono-latin.woff2"),
};
const faces: Record<keyof typeof fontFiles, string> = {
  sans: "font-family:'Bricolage Grotesque';font-style:normal;font-weight:200 800",
  serif: "font-family:'Instrument Serif';font-style:italic;font-weight:400",
  mono: "font-family:'JetBrains Mono';font-style:normal;font-weight:100 800",
};
async function fontCss(used: Partial<Record<keyof typeof fontFiles, string>>) {
  const out: string[] = [];
  for (const [k, text] of Object.entries(used) as [keyof typeof fontFiles, string][]) {
    if (!text) continue;
    const chars = Array.from(new Set(text + " ")).join("");
    const buf = await subsetFont(fontFiles[k], chars, { targetFormat: "woff2" });
    out.push(`@font-face{${faces[k]};src:url(data:font/woff2;base64,${buf.toString("base64")}) format('woff2')}`);
  }
  return out.join("");
}

/* ── helpers ─────────────────────────────────────────────────────────────── */
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, t: number) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/'/g, "&#39;");

/** Greedy word wrap using an average advance per character (checked visually). */
function wrap(text: string, maxWidth: number, fontSize: number, factor = 0.5): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (next.length * fontSize * factor > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
function textBlock(lines: string[], x: number, y: number, size: number, lineHeight: number, attrs: string) {
  return lines.map((l, i) => `<text x="${x}" y="${y + i * lineHeight}" font-size="${size}" ${attrs}>${esc(l)}</text>`).join("");
}

/* ── one keycap: a darker base (side wall) with the coloured top sitting on it ─ */
interface KeyOpts {
  x: number; y: number; w: number; h: number; color: string;
  legend?: string; legendSize?: number; legendColor?: string; legendFont?: string;
  sub?: string; icon?: string; iconSize?: number; cls?: string; title?: string;
}
function keycap(o: KeyOpts) {
  const legendColor = o.legendColor ?? "#17150f";
  const base = mix(o.color, "#000000", 0.28);
  const topH = o.h - 7;
  const r = Math.min(10, o.w * 0.12);
  const parts = [
    o.title ? `<title>${esc(o.title)}</title>` : "",
    `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="${r + 1}" fill="${base}"/>`,
    `<rect x="${o.x}" y="${o.y + o.h - 3}" width="${o.w}" height="3" rx="1.5" fill="${mix(o.color, "#000000", 0.45)}" opacity="0.6"/>`,
    `<g class="${o.cls ?? "top"}">`,
    `<rect x="${o.x + 3}" y="${o.y + 1}" width="${o.w - 6}" height="${topH}" rx="${r}" fill="${o.color}"/>`,
    `<rect x="${o.x + 4}" y="${o.y + 2}" width="${o.w - 8}" height="${topH - 2}" rx="${r - 1}" fill="none" stroke="${mix(o.color, "#ffffff", 0.5)}" stroke-opacity="0.7"/>`,
    `<rect x="${o.x + 3}" y="${o.y + 1}" width="${o.w - 6}" height="${topH}" rx="${r}" fill="url(#sheen)"/>`,
  ];
  if (o.icon) {
    const s = o.iconSize ?? 24;
    const cx = o.x + o.w / 2 - s / 2;
    const cy = o.y + 1 + (topH - s) / 2 - (o.sub ? 6 : 0);
    parts.push(`<g transform="translate(${cx} ${cy}) scale(${s / 24})"><path d="${o.icon}" fill="${legendColor}"/></g>`);
  } else if (o.legend) {
    const size = o.legendSize ?? Math.round(o.h * 0.42);
    const font = o.legendFont ?? SANS;
    const dy = o.sub ? -6 : 0;
    parts.push(`<text x="${o.x + o.w / 2}" y="${o.y + 1 + topH / 2 + dy}" text-anchor="middle" dominant-baseline="central" font-family="${font}" font-weight="700" font-size="${size}" fill="${legendColor}">${esc(o.legend)}</text>`);
  }
  if (o.sub) {
    parts.push(`<text x="${o.x + o.w / 2}" y="${o.y + topH - 8}" text-anchor="middle" font-family="${MONO}" font-size="9.5" letter-spacing="0.2" fill="${legendColor}" fill-opacity="0.8">${esc(o.sub)}</text>`);
  }
  parts.push(`</g>`);
  return parts.join("");
}

const defs = `<defs><linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.05"/></linearGradient></defs>`;

/* ── banner ──────────────────────────────────────────────────────────────── */
const letters = [
  { ch: "M", color: "#F07C6E" },
  { ch: "E", color: "#B79CEB" },
  { ch: "H", color: "#8ED5B5" },
  { ch: "B", color: "#F2C14E" },
  { ch: "O", color: "#7FB8EA" },
  { ch: "O", color: "#F4A87B" },
  { ch: "B", color: "#A7C96C" },
];

async function banner(t: Theme) {
  const c = theme[t];
  const W = 1200, H = 430;
  const u = 96, gap = 12;
  const n = letters.length + 1; // + Enter
  const rowW = n * u + (n - 1) * gap + u * 0.5; // Enter is 1.5u wide
  let x = (W - rowW) / 2;
  const y = 92;
  const keys: string[] = [];
  letters.forEach((l, i) => {
    keys.push(keycap({ x, y, w: u, h: u, color: l.color, legend: l.ch, legendSize: 42, cls: `k k${i}`, title: l.ch }));
    x += u + gap;
  });
  keys.push(keycap({ x, y, w: u * 1.5, h: u, color: c.enter, legend: "⏎", legendSize: 36, legendColor: c.enterLegend, legendFont: MONO, cls: `k k${letters.length}`, title: "Enter" }));

  const period = 9, step = 0.55;
  const anim = [
    `.k{transform:translateY(0);animation:press ${period}s cubic-bezier(.2,.8,.2,1) infinite}`,
    ...Array.from({ length: n }, (_, i) => `.k${i}{animation-delay:${(i * step).toFixed(2)}s}`),
    `@keyframes press{0%,1.5%{transform:translateY(0)}2.5%,4%{transform:translateY(5px)}5.5%,100%{transform:translateY(0)}}`,
    `.caret{animation:blink 1.1s steps(1) infinite}@keyframes blink{50%{opacity:0}}`,
    `@media (prefers-reduced-motion:reduce){.k,.caret{animation:none}}`,
  ].join("");

  const eyebrowL = "MEHBOOBSHAIKH.COM", eyebrowR = "THANE · MUMBAI · IST";
  const title = "Hi, I'm Mehboob.";
  const subA = "A ", subAccent = "lead full-stack engineer", subB = " who takes ideas to MVP and platforms to scale.";
  const mono = "Next.js · Sanity · WordPress · Django · Node · AWS / GCP";
  const fonts = await fontCss({ sans: title + subA + subB + "MEHBO", serif: subAccent, mono: eyebrowL + eyebrowR + mono + "⏎▍" });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">Mehboob Shaikh</title><desc id="d">MEHBOOB spelled out on seven coloured keycaps and an Enter key. ${title} ${subA}${subAccent}${subB}</desc>
${defs}<style>${fonts}${anim}</style>
<rect width="${W}" height="${H}" rx="24" fill="${c.bg}"/>
<text x="56" y="52" font-family="${MONO}" font-size="12" letter-spacing="2.4" fill="${c.muted}">${eyebrowL}</text>
<text x="${W - 56}" y="52" text-anchor="end" font-family="${MONO}" font-size="12" letter-spacing="2.4" fill="${c.muted}">${eyebrowR}</text>
${keys.join("\n")}
<text x="${W / 2}" y="270" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="46" letter-spacing="-1" fill="${c.ink}">${esc(title)}</text>
<text x="${W / 2}" y="316" text-anchor="middle" font-family="${SANS}" font-size="23" fill="${c.ink2}">${esc(subA)}<tspan font-family="${SERIF}" font-size="27" fill="${c.ink}">${esc(subAccent)}</tspan>${esc(subB)}</text>
<text x="${W / 2}" y="374" text-anchor="middle" font-family="${MONO}" font-size="13" letter-spacing="1.2" fill="${c.muted}">${esc(mono)}<tspan class="caret" fill="${c.ink}"> ▍</tspan></text>
</svg>
`;
}

/* ── toolkit board ───────────────────────────────────────────────────────── */
type Cat = "language" | "frontend" | "cms" | "backend" | "data" | "infra" | "tooling" | "practice";
const cats: Record<Cat, { label: string; color: string }> = {
  language: { label: "Languages", color: "#F07C6E" },
  frontend: { label: "Frontend", color: "#B79CEB" },
  cms: { label: "CMS & content", color: "#F09BC2" },
  backend: { label: "Backend", color: "#8ED5B5" },
  data: { label: "Data", color: "#7FB8EA" },
  infra: { label: "Cloud & infra", color: "#F2C14E" },
  tooling: { label: "Tooling", color: "#8FA6F1" },
  practice: { label: "Practice", color: "#A7C96C" },
};
interface Key { label: string; cat: Cat; icon?: keyof typeof si; legend?: string }
const rows: Key[][] = [
  [
    { label: "TypeScript", cat: "language", icon: "siTypescript" },
    { label: "JavaScript", cat: "language", icon: "siJavascript" },
    { label: "Python", cat: "language", icon: "siPython" },
    { label: "PHP", cat: "language", icon: "siPhp" },
    { label: "SQL", cat: "language", legend: "SQL" },
    { label: "Next.js", cat: "frontend", icon: "siNextdotjs" },
    { label: "Tailwind", cat: "frontend", icon: "siTailwindcss" },
    { label: "shadcn/ui", cat: "frontend", icon: "siShadcnui" },
    { label: "Sanity", cat: "cms", icon: "siSanity" },
    { label: "WordPress", cat: "cms", icon: "siWordpress" },
  ],
  [
    { label: "Contentful", cat: "cms", icon: "siContentful" },
    { label: "Node.js", cat: "backend", icon: "siNodedotjs" },
    { label: "Django", cat: "backend", icon: "siDjango" },
    { label: "NestJS", cat: "backend", icon: "siNestjs" },
    { label: "GraphQL", cat: "backend", icon: "siGraphql" },
    { label: "Prisma", cat: "backend", icon: "siPrisma" },
    { label: "Postgres", cat: "data", icon: "siPostgresql" },
    { label: "MySQL", cat: "data", icon: "siMysql" },
    { label: "MongoDB", cat: "data", icon: "siMongodb" },
  ],
  [
    { label: "BigQuery", cat: "data", icon: "siGooglebigquery" },
    { label: "AWS", cat: "infra", legend: "AWS" },
    { label: "Vercel", cat: "infra", icon: "siVercel" },
    { label: "Google Cloud", cat: "infra", icon: "siGooglecloud" },
    { label: "WP Engine", cat: "infra", icon: "siWpengine" },
    { label: "GH Actions", cat: "infra", icon: "siGithubactions" },
    { label: "Docker", cat: "infra", icon: "siDocker" },
    { label: "Terraform", cat: "infra", icon: "siTerraform" },
    { label: "Tech SEO", cat: "practice", legend: "SEO" },
  ],
  [
    { label: "GA4 / GTM", cat: "practice", icon: "siGoogleanalytics" },
    { label: "Web perf", cat: "practice", legend: "CWV" },
    { label: "AI tooling", cat: "practice", legend: "AI" },
    { label: "Tech lead", cat: "practice", legend: "Ldr" },
    { label: "Bun", cat: "tooling", icon: "siBun" },
    { label: "pnpm", cat: "tooling", icon: "siPnpm" },
    { label: "npm", cat: "tooling", icon: "siNpm" },
    { label: "pip", cat: "tooling", icon: "siPypi" },
    { label: "Gulp", cat: "tooling", icon: "siGulp" },
  ],
];

async function stackBoard(t: Theme) {
  const c = theme[t];
  const u = 76, gap = 9, pad = 24;
  const cols = Math.max(...rows.map((r) => r.length));
  const W = pad * 2 + cols * u + (cols - 1) * gap;
  const legendH = 44;
  const H = pad * 2 + rows.length * u + (rows.length - 1) * gap + legendH;
  const out: string[] = [];
  rows.forEach((row, ri) => {
    const offset = ri * u * 0.25; // stagger each row like a real keyboard
    row.forEach((k, ci) => {
      const x = pad + offset + ci * (u + gap);
      const y = pad + ri * (u + gap);
      const icon = k.icon ? (si[k.icon] as { path: string }).path : undefined;
      out.push(keycap({ x, y, w: u, h: u, color: cats[k.cat].color, icon, iconSize: 26, legend: k.legend, legendSize: 19, legendFont: MONO, sub: k.label, title: k.label }));
    });
  });
  let lx = pad;
  const ly = H - pad - 6;
  const legend = Object.values(cats).map((cat) => {
    const s = `<circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${cat.color}"/><text x="${lx + 16}" y="${ly}" font-family="${MONO}" font-size="11.5" fill="${c.muted}">${esc(cat.label)}</text>`;
    lx += 16 + cat.label.length * 7.2 + 22;
    return s;
  });
  const monoText = rows.flat().map((k) => k.label + (k.legend ?? "")).join("") + Object.values(cats).map((x) => x.label).join("");
  const fonts = await fontCss({ mono: monoText });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t">
<title id="t">Toolkit: ${rows.flat().map((k) => k.label).join(", ")}</title>
${defs}<style>${fonts}</style>
<rect width="${W}" height="${H}" rx="20" fill="${c.bg}"/>
${out.join("\n")}
${legend.join("")}
</svg>
`;
}

/* ── outcomes strip ──────────────────────────────────────────────────────── */
const outcomes = [
  { value: "3M → 10M+", label: "monthly search impressions on a platform I've owned since 2021", color: "#B79CEB" },
  { value: "100K+", label: "monthly active users supported with zero-downtime releases", color: "#8ED5B5" },
  { value: "−45%", label: "page load time after monolith-to-headless migrations", color: "#F07C6E" },
  { value: "−35%", label: "release cycle time after standardising CI/CD", color: "#F2C14E" },
  { value: "95%+", label: "on-time sprint completion for the team I lead and mentor", color: "#7FB8EA" },
];
async function outcomesStrip(t: Theme) {
  const c = theme[t];
  const W = 1200, pad = 20, gap = 14;
  const tw = (W - pad * 2 - gap * (outcomes.length - 1)) / outcomes.length;
  const th = 172;
  const H = th + pad * 2;
  const tiles = outcomes.map((o, i) => {
    const x = pad + i * (tw + gap);
    const lines = wrap(o.label, tw - 40, 14, 0.5);
    return [
      `<rect x="${x}" y="${pad}" width="${tw}" height="${th}" rx="16" fill="${c.surface}" stroke="${c.line}"/>`,
      `<rect x="${x + 20}" y="${pad + 22}" width="34" height="5" rx="2.5" fill="${o.color}"/>`,
      `<text x="${x + 20}" y="${pad + 78}" font-family="${SANS}" font-weight="700" font-size="${o.value.length > 7 ? 32 : 40}" letter-spacing="-1" fill="${c.ink}">${esc(o.value)}</text>`,
      textBlock(lines, x + 20, pad + 106, 14, 19, `font-family="${SANS}" fill="${c.muted}"`),
    ].join("");
  });
  const fonts = await fontCss({ sans: outcomes.map((o) => o.value + o.label).join("") });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t">
<title id="t">Outcomes: ${outcomes.map((o) => `${o.value} ${o.label}`).join("; ")}</title>
<style>${fonts}</style>
<rect width="${W}" height="${H}" rx="24" fill="${c.bg}"/>
${tiles.join("\n")}
</svg>
`;
}

/* ── ideas grid ──────────────────────────────────────────────────────────── */
const ideas = [
  { title: "Separate content from presentation.", body: "Editors deserve a structured studio; users deserve static-site speed. Decoupling the CMS from the frontend is how you get both, and it's the single decision that has paid off most often in my career." },
  { title: "Measure before you optimise.", body: "Core Web Vitals in CI, Search Console on a dashboard, real-user data over lab scores. A rewrite without a baseline is a guess with a budget." },
  { title: "SEO and tracking are engineering.", body: "Redirect maps, structured data, canonical URLs and analytics events belong in the ticket and the code review, not in a plugin installed the week after launch." },
  { title: "Boring infrastructure, interesting products.", body: "Postgres, a CDN, one CI pipeline and a typed codebase cover a remarkable amount of ground. Spend novelty where the product actually needs it." },
  { title: "Lead by staying hands-on.", body: "The best architecture reviews come from people who still ship. I keep most of my week in the codebase so the team's standards are ones I live by, not ones I remember." },
];
const quote = { a: "“Problem-solving over syntax. ", b: "Culture over raw output.”", by: "— HOW I RUN A TEAM" };

async function ideasGrid(t: Theme) {
  const c = theme[t];
  const W = 1200, pad = 40;
  const headH = 150;
  const cols = 3, cw = (W - pad * 2) / cols, ch = 340;
  const H = headH + ch * 2 + pad;
  const gx = pad, gy = headH;
  const cells = ideas.map((idea, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = gx + col * cw, y = gy + row * ch;
    const titleLines = wrap(idea.title, cw - 80, 26, 0.5);
    const bodyLines = wrap(idea.body, cw - 80, 15.5, 0.49);
    const bodyY = y + 108 + (titleLines.length - 1) * 32 + 42;
    return [
      `<text x="${x + 40}" y="${y + 52}" font-family="${MONO}" font-size="13" letter-spacing="1" fill="${c.muted}">0${i + 1}</text>`,
      textBlock(titleLines, x + 40, y + 108, 26, 32, `font-family="${SANS}" font-weight="700" letter-spacing="-0.5" fill="${c.ink}"`),
      textBlock(bodyLines, x + 40, bodyY, 15.5, 24, `font-family="${SANS}" fill="${c.ink2}"`),
    ].join("");
  });
  // quote card in the last cell
  const qx = gx + 2 * cw, qy = gy + ch;
  const qLines = wrap(quote.a + quote.b, cw - 80, 34, 0.42);
  let seen = 0;
  const qText = qLines.map((l, i) => {
    // colour the part of the line that belongs to the second sentence
    const start = seen; seen += l.length + 1;
    const split = quote.a.length - start;
    let inner: string;
    if (split <= 0) inner = `<tspan fill="${ACCENT}">${esc(l)}</tspan>`;
    else if (split >= l.length) inner = esc(l);
    else inner = `${esc(l.slice(0, split))}<tspan fill="${ACCENT}">${esc(l.slice(split))}</tspan>`;
    return `<text x="${qx + 40}" y="${qy + 128 + i * 44}" font-family="${SERIF}" font-size="34" fill="${c.quoteInk}">${inner}</text>`;
  }).join("");
  const grid = [
    `<rect x="${gx}" y="${gy}" width="${W - pad * 2}" height="${ch * 2}" rx="18" fill="${c.surface}" stroke="${c.line}"/>`,
    `<line x1="${gx + cw}" y1="${gy}" x2="${gx + cw}" y2="${gy + ch * 2}" stroke="${c.line}"/>`,
    `<line x1="${gx + 2 * cw}" y1="${gy}" x2="${gx + 2 * cw}" y2="${gy + ch * 2}" stroke="${c.line}"/>`,
    `<line x1="${gx}" y1="${gy + ch}" x2="${gx + W - pad * 2}" y2="${gy + ch}" stroke="${c.line}"/>`,
    `<path d="M${qx} ${qy} H${qx + cw - 18} a18 18 0 0 1 18 18 V${qy + ch - 18} a18 18 0 0 1 -18 18 H${qx} Z" fill="${c.quoteBg}"/>`,
  ];
  const head = [
    keycap({ x: pad, y: 44, w: 44, h: 44, color: "#8FA6F1", legend: "I", legendSize: 18, legendFont: MONO }),
    `<text x="${pad + 62}" y="60" font-family="${MONO}" font-size="12" letter-spacing="1.6" fill="${c.muted}">05</text>`,
    `<text x="${pad + 62}" y="82" font-family="${MONO}" font-size="12" letter-spacing="2" fill="${c.muted}">IDEAS · FOCUS</text>`,
    `<text x="${W / 2 + 60}" y="86" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="54" letter-spacing="-1.5" fill="${c.ink}">Five ideas I keep <tspan font-family="${SERIF}" font-weight="400" font-size="58" letter-spacing="0" fill="${c.ink2}">coming back to.</tspan></text>`,
  ];
  const sansText = "Five ideas I keep " + ideas.map((i) => i.title + i.body).join("");
  const fonts = await fontCss({ sans: sansText, serif: "coming back to." + quote.a + quote.b, mono: "0123456789IDEAS · FOCUSHOW I RUN A TEAM—" });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">Five ideas I keep coming back to</title>
<desc id="d">${ideas.map((i, n) => `${n + 1}. ${i.title} ${i.body}`).join(" ")} ${quote.a}${quote.b} ${quote.by}</desc>
${defs}<style>${fonts}</style>
<rect width="${W}" height="${H}" rx="24" fill="${c.bg}"/>
${head.join("")}
${grid.join("")}
${cells.join("\n")}
${qText}
<text x="${qx + 40}" y="${qy + ch - 44}" font-family="${MONO}" font-size="12" letter-spacing="2" fill="${c.quoteMuted}">${esc(quote.by)}</text>
</svg>
`;
}

/* ── single keycaps for the side-project table ───────────────────────────── */
const glyphKeys: Record<string, { glyph: string; color: string; title: string }> = {
  cassette: { glyph: "♪", color: "#F09BC2", title: "Dil Ki Cassette" },
  diet: { glyph: "₹", color: "#E8A23A", title: "Subscription Diet" },
  arcade: { glyph: "▶", color: "#7FB8EA", title: "Mehboob's Arcade" },
  portfolio: { glyph: "⌨", color: "#8ED5B5", title: "mehboobshaikh.com" },
  quilo: { glyph: "◠", color: "#B79CEB", title: "Quilo" },
};
function glyphKey(glyph: string, color: string, title: string) {
  const u = 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${u} ${u}" width="${u}" height="${u}" role="img"><title>${esc(title)}</title>${defs}${keycap({ x: 0, y: 0, w: u, h: u, color, legend: glyph, legendSize: 28, legendFont: `ui-sans-serif, system-ui, sans-serif` })}</svg>\n`;
}

/* ── write ───────────────────────────────────────────────────────────────── */
mkdirSync("assets", { recursive: true });
const files: Record<string, string> = {};
for (const t of ["light", "dark"] as Theme[]) {
  files[`assets/banner-${t}.svg`] = await banner(t);
  files[`assets/stack-${t}.svg`] = await stackBoard(t);
  files[`assets/outcomes-${t}.svg`] = await outcomesStrip(t);
  files[`assets/ideas-${t}.svg`] = await ideasGrid(t);
}
for (const [id, k] of Object.entries(glyphKeys)) files[`assets/key-${id}.svg`] = glyphKey(k.glyph, k.color, k.title);
for (const [path, svg] of Object.entries(files)) {
  writeFileSync(path, svg);
  console.log(`${path.padEnd(28)} ${(svg.length / 1024).toFixed(1)} KB`);
}
