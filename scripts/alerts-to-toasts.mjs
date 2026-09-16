// Convert alert(...) calls to toast.success/error/info(...) with emoji stripping.
// Adds the standalone `toast` import with the correct relative path per file.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'src');
const TOAST_MODULE = path.resolve(ROOT, 'components/ui/Toast');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.tsx$/.test(entry.name)) out.push(p);
  }
  return out;
}

const EMOJI = /[\u2705\u274C\u26A0\uFE0F\uD83D\uDD25\uD83D\uDD14]/g;

function classify(snippet) {
  const s = snippet.toLowerCase();
  if (s.includes('gagal') || s.includes('error') || s.includes('fail') || s.includes('❌') || s.includes('tidak valid') || s.includes('ditolak')) return 'error';
  if (s.includes('berhasil') || s.includes('sukses') || s.includes('✅') || s.includes('tersimpan') || s.includes('saved')) return 'success';
  return 'info';
}

let touched = 0;
for (const file of walk(ROOT)) {
  const src = fs.readFileSync(file, 'utf8');
  if (!/\balert\(/.test(src)) continue;

  let out = src;
  // Replace each alert( with classified toast.x( — inspect the following chars for keywords
  out = out.replace(/\balert\(/g, (match, offset) => {
    const lookahead = out.slice(offset, offset + 160);
    return `toast.${classify(lookahead)}(`;
  });

  // Strip decorative emoji from string literals in this file
  out = out.replace(EMOJI, '');

  // Ensure exactly one toast import with correct relative path
  if (!/from ['"].*ui\/Toast['"]/.test(out)) {
    const rel = path.relative(path.dirname(file), TOAST_MODULE).replace(/\\/g, '/').replace(/\.tsx$/, '');
    const importLine = `import { toast } from '${rel.startsWith('.') ? rel : './' + rel}';`;
    // Insert after the last existing import statement
    const imports = [...out.matchAll(/^import .*?;?\s*$/gm)];
    if (imports.length > 0) {
      const last = imports[imports.length - 1];
      const insertAt = last.index + last[0].length;
      out = out.slice(0, insertAt) + '\n' + importLine + out.slice(insertAt);
    } else {
      out = importLine + '\n' + out;
    }
  }

  fs.writeFileSync(file, out, 'utf8');
  touched++;
  console.log('converted', path.relative(process.cwd(), file));
}
console.log(`\n${touched} files converted`);
