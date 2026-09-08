import fs from 'node:fs';

const required = ['index.html', 'src/clinical.js', 'src/extractor.js', 'src/app.js', 'src/storage.js', 'src/styles.css'];
for (const f of required) if (!fs.existsSync(f)) throw new Error(`Missing ${f}`);

// Verificación de ausencia de red/IA externa en el analizador local.
const extractorSource = fs.readFileSync('src/extractor.js', 'utf8');
if (/fetch\s*\(|XMLHttpRequest|WebSocket|openai|anthropic|azure openai|api[_-]?key/i.test(extractorSource)) {
	throw new Error('External network/AI marker found in src/extractor.js');
}
for (const f of ['src/app.js', 'src/clinical.js', 'src/storage.js']) {
	const src = fs.readFileSync(f, 'utf8');
	if (/fetch\s*\(|XMLHttpRequest|WebSocket/i.test(src)) throw new Error(`Network call marker found in ${f}`);
}

fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist/src', { recursive: true });
fs.copyFileSync('index.html', 'dist/index.html');
for (const f of fs.readdirSync('src')) fs.copyFileSync('src/' + f, 'dist/src/' + f);
console.log('Build OK for /cmopediatria/');
