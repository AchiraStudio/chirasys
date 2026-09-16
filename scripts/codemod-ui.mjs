// UI overhaul codemod: maps legacy utility class strings to the new token system.
// Plain string replacements are safe here: class tokens are hyphen-delimited,
// so e.g. replacing `bg-emerald-500` also correctly rewrites `hover:bg-emerald-500`
// and `bg-emerald-500/80` (prefix/opacity variants), while `brands` / `getBrands`
// identifiers never match because they lack the required hyphen prefix or the
// trailing boundary.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'src');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|css)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const rules = [
  // ── 0. Repair pass from prior run ──
  ['success-soft0', 'success'],
  ['danger-soft0', 'danger'],
  ['warning-soft0', 'warning'],
  ['accent-soft0', 'accent'],
  ['primary-soft0', 'primary'],
  [' zoom-in-95', ''],
  [' slide-in-from-bottom-10', ''],
  [' slide-in-from-bottom-2', ''],
  [' slide-in-from-right', ''],
  [' slide-in-from-left', ''],

  // ── 1. Paired light/dark surface patterns (most specific first) ──
  ['bg-white dark:bg-[#0B0F19]', 'bg-card'],
  ['bg-white dark:bg-slate-900/90', 'bg-card'],
  ['bg-white dark:bg-slate-900', 'bg-card'],
  ['bg-white/70 dark:bg-[#0B0F19]/70', 'bg-card/70'],
  ['bg-white/50 dark:bg-[#0B0F19]/50', 'bg-card/50'],
  ['bg-slate-50 dark:bg-[#0B0F19]', 'bg-background'],
  ['bg-slate-50 dark:bg-slate-950', 'bg-muted'],
  ['bg-slate-50 dark:bg-slate-900', 'bg-muted'],
  ['bg-slate-100 dark:bg-slate-900/80', 'bg-muted'],
  ['bg-slate-100 dark:bg-slate-900', 'bg-muted'],
  ['bg-slate-100 dark:bg-slate-800', 'bg-muted'],
  ['bg-slate-100 dark:bg-[#070A11]', 'bg-muted'],
  ['bg-slate-200/80 dark:bg-slate-800', 'bg-line'],
  ['bg-slate-200 dark:bg-slate-700', 'bg-line'],
  ['bg-slate-50/50 dark:bg-slate-900/40', 'bg-muted/40'],
  ['bg-slate-50/50 dark:bg-slate-950/50', 'bg-muted/40'],
  ['hover:bg-slate-100 dark:hover:bg-slate-800/60', 'hover:bg-muted'],
  ['hover:bg-slate-100 dark:hover:bg-slate-800/40', 'hover:bg-muted'],
  ['hover:bg-slate-100 dark:hover:bg-slate-800', 'hover:bg-muted'],
  ['hover:bg-slate-50 dark:hover:bg-slate-800', 'hover:bg-muted'],
  ['hover:bg-slate-50 dark:hover:bg-slate-900', 'hover:bg-muted'],
  ['hover:bg-white dark:hover:bg-slate-800', 'hover:bg-card'],

  // Border pairs
  ['border-slate-200 dark:border-slate-800/60', 'border-line'],
  ['border-slate-200/80 dark:border-slate-800/80', 'border-line'],
  ['border-slate-200/80 dark:border-slate-800', 'border-line'],
  ['border-slate-200 dark:border-slate-800', 'border-line'],
  ['border-slate-200/60 dark:border-slate-800/60', 'border-line'],
  ['border-slate-200/60 dark:border-slate-700/60', 'border-line'],
  ['border-slate-200 dark:border-slate-700', 'border-line'],
  ['border-slate-100 dark:border-slate-800/80', 'border-line'],
  ['border-slate-100 dark:border-slate-800', 'border-line'],
  ['dark:border-slate-800/80', 'dark:border-line'],
  ['dark:border-slate-800/60', 'dark:border-line'],
  ['dark:border-slate-800', 'dark:border-line'],
  ['dark:border-slate-700/50', 'dark:border-line'],
  ['dark:border-slate-700/30', 'dark:border-line'],
  ['dark:border-slate-700', 'dark:border-line-strong'],

  // Text pairs
  ['text-slate-900 dark:text-white', 'text-heading'],
  ['text-slate-900 dark:text-slate-100', 'text-heading'],
  ['text-slate-900 dark:text-slate-200', 'text-heading'],
  ['text-slate-800 dark:text-slate-200', 'text-heading'],
  ['text-slate-700 dark:text-slate-300', 'text-heading'],
  ['text-slate-600 dark:text-slate-400', 'text-body'],
  ['text-slate-600 dark:text-slate-300', 'text-body'],
  ['text-slate-500 dark:text-slate-400', 'text-dim'],
  ['text-slate-500 dark:text-slate-500', 'text-dim'],
  ['text-slate-400 dark:text-slate-500', 'text-dim'],
  ['placeholder:text-slate-400 dark:placeholder:text-slate-500', 'placeholder:text-dim'],
  ['dark:text-slate-100', 'dark:text-heading'],
  ['dark:text-slate-200', 'dark:text-heading'],
  ['dark:text-slate-300', 'dark:text-body'],
  ['dark:text-slate-400', 'dark:text-body'],
  ['dark:text-slate-500', 'dark:text-dim'],

  // ── 2. Primary button hover drift (must run BEFORE blue scale map) ──
  ['hover:bg-blue-600', 'hover:bg-primary-hover'],
  ['hover:bg-blue-700', 'hover:bg-primary-hover'],
  ['hover:bg-indigo-600', 'hover:bg-primary-hover'],
  ['hover:bg-indigo-700', 'hover:bg-primary-hover'],

  // Brand alias → primary (then soft variants)
  ['-brand-hover', '-primary-hover'],
  ['-brand-dark', '-primary-hover'],
  [/(-brand)(?![\w-])/g, '-primary'],
  ['bg-primary/10', 'bg-primary-soft'],
  ['bg-primary/20', 'bg-primary-soft'],
  ['bg-primary/5', 'bg-primary-soft'],
  ['dark:bg-primary/20', 'dark:bg-primary-soft'],

  // ── 3. Status scale mappings (scale-name level so opacity/variant forms follow) ──
  // success (emerald / teal / green)
  ['emerald-50', 'success-soft'],
  ['emerald-100', 'success-soft'],
  ['emerald-200', 'success/30'],
  ['emerald-300', 'success'],
  ['emerald-400', 'success'],
  ['emerald-500', 'success'],
  ['emerald-600', 'success'],
  ['emerald-700', 'success'],
  ['emerald-800', 'success'],
  ['emerald-900', 'success'],
  ['emerald-950', 'success'],
  ['teal-400', 'success'],
  ['teal-500', 'success'],
  ['teal-600', 'success'],
  ['green-500', 'success'],
  ['green-600', 'success'],
  ['green-50', 'success-soft'],
  ['green-100', 'success-soft'],

  // danger (rose / red)
  ['rose-50', 'danger-soft'],
  ['rose-100', 'danger-soft'],
  ['rose-200', 'danger/30'],
  ['rose-300', 'danger'],
  ['rose-400', 'danger'],
  ['rose-500', 'danger'],
  ['rose-600', 'danger'],
  ['rose-700', 'danger'],
  ['rose-800', 'danger'],
  ['rose-900', 'danger'],
  ['rose-950', 'danger'],
  ['red-50', 'danger-soft'],
  ['red-100', 'danger-soft'],
  ['red-200', 'danger/30'],
  ['red-300', 'danger'],
  ['red-500', 'danger'],
  ['red-600', 'danger'],
  ['red-700', 'danger'],

  // warning (amber / yellow / orange)
  ['amber-50', 'warning-soft'],
  ['amber-100', 'warning-soft'],
  ['amber-200', 'warning/30'],
  ['amber-300', 'warning'],
  ['amber-400', 'warning'],
  ['amber-500', 'warning'],
  ['amber-600', 'warning'],
  ['amber-700', 'warning'],
  ['amber-800', 'warning'],
  ['amber-900', 'warning'],
  ['yellow-400', 'warning'],
  ['yellow-500', 'warning'],
  ['orange-500', 'warning'],
  ['orange-600', 'warning'],

  // info/accent (blue / sky / cyan)
  ['blue-50', 'accent-soft'],
  ['blue-100', 'accent-soft'],
  ['blue-200', 'accent/30'],
  ['blue-300', 'accent'],
  ['blue-400', 'accent'],
  ['blue-500', 'accent'],
  ['blue-600', 'accent'],
  ['blue-700', 'accent'],
  ['blue-800', 'accent'],
  ['blue-900', 'accent'],
  ['sky-50', 'accent-soft'],
  ['sky-100', 'accent-soft'],
  ['sky-400', 'accent'],
  ['sky-500', 'accent'],
  ['sky-600', 'accent'],
  ['cyan-400', 'accent'],
  ['cyan-500', 'accent'],
  ['cyan-600', 'accent'],

  // primary-ish (indigo / violet / purple / fuchsia / pink)
  ['indigo-50', 'primary-soft'],
  ['indigo-100', 'primary-soft'],
  ['indigo-200', 'primary/30'],
  ['indigo-300', 'primary'],
  ['indigo-400', 'primary'],
  ['indigo-500', 'primary'],
  ['indigo-600', 'primary'],
  ['indigo-700', 'primary-hover'],
  ['indigo-800', 'primary'],
  ['indigo-900', 'primary'],
  ['indigo-950', 'primary'],
  ['violet-500', 'primary'],
  ['violet-600', 'primary'],
  ['purple-50', 'primary-soft'],
  ['purple-100', 'primary-soft'],
  ['purple-500', 'primary'],
  ['purple-600', 'primary'],
  ['fuchsia-500', 'primary'],
  ['pink-500', 'primary'],

  // ── 4. Remaining slate singles (word-boundary so opacity suffixes ride along) ──
  [/bg-slate-800(?![\w-])/g, 'bg-muted'],
  [/bg-slate-900(?![\w-])/g, 'bg-card'],
  [/bg-slate-950(?![\w-])/g, 'bg-input'],
  [/bg-slate-700(?![\w-])/g, 'bg-line-strong'],
  [/bg-slate-50(?![\w-])/g, 'bg-muted'],
  [/bg-slate-100(?![\w-])/g, 'bg-muted'],
  [/bg-slate-200(?![\w-])/g, 'bg-line'],
  [/bg-slate-300(?![\w-])/g, 'bg-line-strong'],
  [/bg-white(?![\w-])/g, 'bg-card'],
  [/text-slate-900(?![\w-])/g, 'text-heading'],
  [/text-slate-800(?![\w-])/g, 'text-heading'],
  [/text-slate-700(?![\w-])/g, 'text-body'],
  [/text-slate-600(?![\w-])/g, 'text-body'],
  [/text-slate-500(?![\w-])/g, 'text-dim'],
  [/text-slate-400(?![\w-])/g, 'text-dim'],
  [/text-slate-300(?![\w-])/g, 'text-dim'],
  ['divide-slate-200', 'divide-line'],
  ['divide-slate-100', 'divide-line'],
  ['divide-slate-800', 'divide-line'],
  ['border-slate-300', 'border-line-strong'],
  ['border-slate-200', 'border-line'],
  ['border-slate-100', 'border-line'],

  // Hardcoded dark hex canvases → tokens
  ['bg-[#0B0F19]', 'bg-card'],
  ['bg-[#070A11]', 'bg-muted'],
  ['bg-[#09090b]', 'bg-background'],

  // Gradient endpoint fallbacks
  ['from-white', 'from-card'],
  ['via-white', 'via-card'],

  // ── 5. Dead tailwindcss-animate classes → real keyframe animations ──
  ['animate-in zoom-in-95 fade-in', 'animate-pop-in'],
  ['animate-in fade-in zoom-in-95', 'animate-pop-in'],
  ['animate-in slide-in-from-right fade-in', 'animate-slide-in-right'],
  ['animate-in fade-in slide-in-from-right', 'animate-slide-in-right'],
  ['animate-in fade-in slide-in-from-bottom-4', 'animate-slide-in-up'],
  ['animate-in fade-in slide-in-from-bottom-10', 'animate-slide-in-up'],
  ['animate-in slide-in-from-right duration-300', 'animate-slide-in-right'],
  ['animate-in slide-in-from-right', 'animate-slide-in-right'],
  ['animate-in fade-in duration-200', 'animate-fade-in'],
  ['animate-in fade-in duration-300', 'animate-fade-in'],
  ['animate-in fade-in', 'animate-fade-in'],
  ['animate-in', 'animate-fade-in'],

  // ── 6. Radius normalization: cards/panels/inputs → rounded-xl ──
  ['rounded-3xl', 'rounded-xl'],
  ['rounded-2xl', 'rounded-xl'],
];

let touched = 0;
for (const file of walk(ROOT)) {
  const src = fs.readFileSync(file, 'utf8');
  let out = src;
  for (const rule of rules) {
    const [from, to] = rule;
    if (typeof from === 'string') {
      if (out.includes(from)) out = out.split(from).join(to);
    } else {
      out = out.replace(from, to);
    }
  }
  if (out !== src) {
    fs.writeFileSync(file, out, 'utf8');
    touched++;
    console.log('updated', path.relative(process.cwd(), file));
  }
}
console.log(`\n${touched} files updated`);
