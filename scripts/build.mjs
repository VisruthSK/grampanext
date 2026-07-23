import { rmSync, mkdirSync, cpSync } from 'node:fs';
import { execSync } from 'node:child_process';

const FILES = ['src', 'styles', 'LICENSE', 'NOTICE', 'icons'];

for (const target of ['chrome', 'firefox']) {
  const out = `dist/${target}`;
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const f of FILES) cpSync(f, `${out}/${f}`, { recursive: true });
  cpSync(`manifest.${target}.json`, `${out}/manifest.json`);
  execSync(`powershell -NoProfile -c "Compress-Archive -Path ${out}/* -DestinationPath dist/grampanext-${target}.zip -Force"`);
  console.log(`Built dist/grampanext-${target}.zip`);
}
