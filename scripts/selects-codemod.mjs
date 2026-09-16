// Convert native <select> elements to the custom ui/Select dropdown.
// Brace-aware scan finds the real end of each opening tag (props contain "=>").
// Event-param handlers are rewritten to value callbacks: (e) => setX(e.target.value) → (v) => setX(v).
// <option> children are kept — ui/Select parses them at runtime.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'src');
const EXCLUDE = new Set([
  path.resolve(ROOT, 'components/ui/Select.tsx'),
  path.resolve(ROOT, 'components/ui/Field.tsx'),
]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.tsx$/.test(entry.name) && !EXCLUDE.has(p)) out.push(p);
  }
  return out;
}

// Find end index of an opening tag starting at '<select' (index of the final '>')
function findTagEnd(src, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '>' && depth === 0) return i;
  }
  return -1;
}

let touched = 0;
const manualFixes = [];

for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('<select')) continue;
  const orig = src;

  // Rewrite each opening tag
  let idx;
  while ((idx = src.indexOf('<select', idx !== undefined ? idx : 0)) !== -1) {
    const end = findTagEnd(src, idx);
    if (end === -1) break;
    let tag = src.slice(idx, end); // excludes the final '>'
    tag = '<Select' + tag.slice('<select'.length);

    // Rename event params in onChange handlers
    tag = tag.replace(/onChange=\{\s*\(\s*(?:e|event)\s*\)\s*=>/g, 'onChange={(v) =>');
    tag = tag.replace(/onChange=\{\s*(?:e|event)\s*=>/g, 'onChange={v =>');
    tag = tag.replace(/e\.target\.value/g, 'v');
    tag = tag.replace(/event\.target\.value/g, 'v');

    // Flag handlers that still reference the event object
    if (/\b(?:e|event)\./.test(tag)) {
      manualFixes.push(`${path.relative(process.cwd(), file)}: ${tag.slice(0, 120)}`);
    }

    src = src.slice(0, idx) + tag + src.slice(end);
    idx += tag.length;
  }

  src = src.split('</select>').join('</Select>');

  if (src === orig) continue;

  // Add import if missing
  if (!/from ['"].*ui\/Select['"]/.test(src)) {
    const rel = path.relative(path.dirname(file), path.resolve(ROOT, 'components/ui/Select'))
      .replace(/\\/g, '/').replace(/\.tsx$/, '');
    const importLine = `import Select from '${rel.startsWith('.') ? rel : './' + rel}';`;
    const imports = [...src.matchAll(/^import .*?;?\s*$/gm)];
    if (imports.length > 0) {
      const last = imports[imports.length - 1];
      const at = last.index + last[0].length;
      src = src.slice(0, at) + '\n' + importLine + src.slice(at);
    } else {
      src = importLine + '\n' + src;
    }
  }

  fs.writeFileSync(file, src, 'utf8');
  touched++;
  console.log('converted', path.relative(process.cwd(), file));
}

console.log(`\n${touched} files converted`);
if (manualFixes.length) {
  console.log('\nNEEDS MANUAL REVIEW (event object still referenced):');
  manualFixes.forEach((m) => console.log(' -', m));
}
