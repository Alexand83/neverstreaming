/**
 * Script per preparare il deploy su GitHub Pages.
 * Crea la cartella "docs" con HTML che usano path senza ../ e con <base>.
 *
 * Uso (sostituisci USERNAME e REPO con i tuoi):
 *   node prepare-gh-pages.js
 *
 * Poi in GitHub: Settings → Pages → Source: Deploy from branch → Branch: main, Folder: /docs
 *
 * Oppure copia il contenuto di "docs" nella ROOT del repo e in Pages scegli Folder: / (root).
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'docs');
let REPO_BASE = process.env.GH_PAGES_BASE || '';
if (!REPO_BASE && process.argv[2] && process.argv[2].startsWith('http')) {
  REPO_BASE = process.argv[2].endsWith('/') ? process.argv[2] : process.argv[2] + '/';
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function patchHtml(content, baseUrl) {
  let out = content
    .replace(/href="\.\.\/css\//g, 'href="css/')
    .replace(/href="\.\.\/js\//g, 'href="js/')
    .replace(/src="\.\.\/css\//g, 'src="css/')
    .replace(/src="\.\.\/js\//g, 'src="js/')
    .replace(/src="\.\.\/firebase\//g, 'src="firebase/');
  if (baseUrl && !out.includes('<base')) {
    out = out.replace(/<head>/, '<head>\n  <base href="' + baseUrl + '">');
  }
  return out;
}

ensureDir(OUT_DIR);

const publicDir = path.join(__dirname, 'public');
['index.html', 'join.html', 'studio.html'].forEach((name) => {
  const src = path.join(publicDir, name);
  let content = fs.readFileSync(src, 'utf8');
  content = patchHtml(content, REPO_BASE);
  fs.writeFileSync(path.join(OUT_DIR, name), content);
});

copyDir(path.join(__dirname, 'css'), path.join(OUT_DIR, 'css'));
copyDir(path.join(__dirname, 'js'), path.join(OUT_DIR, 'js'));
copyDir(path.join(__dirname, 'firebase'), path.join(OUT_DIR, 'firebase'));

console.log('OK: cartella "docs" pronta in', OUT_DIR);
if (!REPO_BASE) {
  console.log('');
  console.log('IMPORTANTE: aggiungi a mano il tag <base> in index.html, join.html e studio.html:');
  console.log('  <base href="https://TUO_USERNAME.github.io/NOME_REPO/">');
  console.log('');
  console.log('Oppure riesegui con: GH_PAGES_BASE="https://TUO_USERNAME.github.io/NOME_REPO/" node prepare-gh-pages.js');
}
