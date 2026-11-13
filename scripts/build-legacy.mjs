// Builds old-browser copies of the site scripts into /legacy (run: node scripts/build-legacy.mjs).
// Old engines (before about 2020) cannot read modern JavaScript, so index.html loads these copies for them.
import { createRequire } from "module";
const { build } = createRequire(import.meta.url)("esbuild");
const TARGET = ["chrome58"];
// Chrome before 64 cannot read \p{L} regex classes, so swap them for plain letter ranges
import { readFileSync } from "fs";
const LET = "A-Za-z\\u00C0-\\u024F\\u0370-\\u03FF\\u0400-\\u04FF\\u0590-\\u06FF\\u0900-\\u097F\\u3040-\\u30FF\\u4E00-\\u9FFF\\uAC00-\\uD7AF";
const plainRegex = {
  name: "plain-regex",
  setup(b) {
    b.onLoad({ filter: /\.js$/ }, (a) => {
      const src = readFileSync(a.path, "utf8");
      const out = src.replace(/\/((?:[^\/\n\\]|\\.)*\\p\{(?:[^\/\n\\]|\\.)*)\/([a-z]*)/g, (m, body, flags) => {
        let nb = body === "\\p{L}" ? "[" + LET + "]" : body.split("\\p{L}").join(LET).split("\\p{N}").join("0-9");
        return "/" + nb + "/" + flags.replace("u", "");
      });
      return { contents: out, loader: "js" };
    });
  }
};
const supabaseShim = {
  name: "supabase-shim",
  setup(b) {
    b.onResolve({ filter: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\// }, () => ({ path: "supabase", namespace: "sb" }));
    b.onLoad({ filter: /.*/, namespace: "sb" }, () => ({
      contents: "export const createClient = function () { return window.supabase.createClient.apply(window.supabase, arguments); };",
      loader: "js"
    }));
  }
};
await build({ entryPoints: ["app.js"], bundle: true, format: "iife", target: TARGET, outfile: "legacy/app.js", plugins: [plainRegex, supabaseShim], minify: true, logLevel: "warning" });
for (const f of ["market-bar.js", "search.js", "pcnai.js", "i18n.js", "menu.js"]) {
  await build({ entryPoints: [f], bundle: false, format: "iife", target: TARGET, plugins: [plainRegex], outfile: "legacy/" + f, minify: true, logLevel: "warning" });
}
await build({ entryPoints: ["styles.css"], bundle: false, target: TARGET, outfile: "legacy/styles.css", minify: true, logLevel: "warning" });
console.log("legacy build done");
