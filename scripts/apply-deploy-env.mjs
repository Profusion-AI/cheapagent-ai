import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = fileURLToPath(new URL("../dist/", import.meta.url));
const deployContext = process.env.CONTEXT || "";
const explicitEnv = process.env.VITE_CHEAPAGENT_ENV || "";
const envName = normalizeEnv(
  explicitEnv || (deployContext && deployContext !== "production" ? "staging" : "production"),
);
const canonicalUrl = normalizeUrl(
  process.env.VITE_CHEAPAGENT_CANONICAL_URL ||
    (envName === "production" ? "https://cheapagent.ai" : "https://cheapagent.netlify.app"),
);
const explicitNoindex = process.env.VITE_CHEAPAGENT_NOINDEX;
const noindex =
  explicitNoindex === "true" ||
  (explicitNoindex !== "false" && (envName !== "production" || deployContext === "deploy-preview"));

const indexPath = join(distDir, "index.html");
// Pages beyond index get env metadata, robots handling, and a canonical + sitemap entry.
const secondaryPages = ["privacy.html", "honesty.html", "api.html"];
const robotsPath = join(distDir, "robots.txt");
const sitemapPath = join(distDir, "sitemap.xml");
const headersPath = join(distDir, "_headers");
const logoUrl = `${canonicalUrl}/assets/cheapagent-logo-knockout.png`;

if (!existsSync(indexPath)) {
  throw new Error("dist/index.html was not found. Run this script after vite build.");
}

let html = readFileSync(indexPath, "utf8");
html = html.replace(/<html([^>]*)>/, (match, attrs) => {
  const nextAttrs = attrs
    .replace(/\sdata-deploy-env="[^"]*"/, "")
    .trim();
  return `<html ${nextAttrs} data-deploy-env="${envName}">`;
});
html = upsertMeta(html, "name", "cheapagent:environment", envName);
html = noindex
  ? upsertMeta(html, "name", "robots", "noindex, nofollow")
  : removeMeta(html, "name", "robots");
html = replaceLink(html, "canonical", `${canonicalUrl}/`);
html = replaceMeta(html, "property", "og:url", `${canonicalUrl}/`);
html = replaceMeta(html, "property", "og:image", logoUrl);
html = replaceMeta(html, "name", "twitter:image", logoUrl);
writeFileSync(indexPath, html);

for (const page of secondaryPages) {
  const pagePath = join(distDir, page);
  if (!existsSync(pagePath)) {
    continue;
  }
  let pageHtml = readFileSync(pagePath, "utf8");
  pageHtml = upsertMeta(pageHtml, "name", "cheapagent:environment", envName);
  pageHtml = noindex
    ? upsertMeta(pageHtml, "name", "robots", "noindex, nofollow")
    : removeMeta(pageHtml, "name", "robots");
  pageHtml = replaceLink(pageHtml, "canonical", `${canonicalUrl}/${page}`);
  writeFileSync(pagePath, pageHtml);
}

if (noindex) {
  writeFileSync(robotsPath, "User-agent: *\nDisallow: /\n");
  writeFileSync(
    sitemapPath,
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n',
  );
  writeFileSync(headersPath, "/*\n  X-Robots-Tag: noindex, nofollow\n");
} else {
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(robotsPath, `User-agent: *\nAllow: /\n\nSitemap: ${canonicalUrl}/sitemap.xml\n`);
  const sitemapEntries = ["", ...secondaryPages]
    .map((page) => `  <url>\n    <loc>${canonicalUrl}/${page}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
    .join("\n");
  writeFileSync(
    sitemapPath,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
  );
  if (existsSync(headersPath)) {
    rmSync(headersPath);
  }
}

console.log(
  `CheapAgent deploy metadata: env=${envName}, canonical=${canonicalUrl}, noindex=${noindex}`,
);

function normalizeEnv(value) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "-") || "production";
}

function normalizeUrl(value) {
  return value.replace(/\/+$/, "");
}

function replaceLink(html, rel, href) {
  const pattern = new RegExp(`<link\\s+rel="${rel}"\\s+href="[^"]*"\\s*>`);
  if (pattern.test(html)) {
    return html.replace(pattern, `<link rel="${rel}" href="${href}">`);
  }
  return html.replace("</head>", `  <link rel="${rel}" href="${href}">\n</head>`);
}

function replaceMeta(html, attr, key, content) {
  const pattern = new RegExp(`<meta\\s+${attr}="${escapeRegExp(key)}"\\s+content="[^"]*"\\s*>`);
  if (pattern.test(html)) {
    return html.replace(pattern, `<meta ${attr}="${key}" content="${content}">`);
  }
  return html.replace("</head>", `  <meta ${attr}="${key}" content="${content}">\n</head>`);
}

function upsertMeta(html, attr, key, content) {
  return replaceMeta(removeMeta(html, attr, key), attr, key, content);
}

function removeMeta(html, attr, key) {
  const pattern = new RegExp(`\\s*<meta\\s+${attr}="${escapeRegExp(key)}"\\s+content="[^"]*"\\s*>\\n?`, "g");
  return html.replace(pattern, "\n");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
