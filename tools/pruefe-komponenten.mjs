#!/usr/bin/env node
/**
 * Enforces the component structure rules: every `@Component` lives in its own folder named
 * after it, uses `templateUrl` and `styleUrl`, and has a sibling `.html`, `.scss` and
 * `.spec.ts`. Inline `template:`/`styles:` are rejected everywhere under `src/`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

const wurzel = process.cwd();
const fehler = [];

function dateienVerzeichnis(verzeichnis) {
  return readdirSync(verzeichnis).flatMap((eintrag) => {
    const pfad = join(verzeichnis, eintrag);
    return statSync(pfad).isDirectory() ? dateienVerzeichnis(pfad) : [pfad];
  });
}

const tsDateien = dateienVerzeichnis(join(wurzel, 'src')).filter((pfad) => pfad.endsWith('.ts'));

for (const pfad of tsDateien) {
  const relativ = relative(wurzel, pfad).replaceAll('\\', '/');
  const quelle = readFileSync(pfad, 'utf8');

  if (/\btemplate\s*:/.test(quelle)) {
    fehler.push(`${relativ}: inline \`template:\` is not allowed; move it to a .html file.`);
  }
  if (/\bstyles\s*:/.test(quelle)) {
    fehler.push(`${relativ}: inline \`styles:\` is not allowed; move it to a .scss file.`);
  }
  if (!/@Component\s*\(/.test(quelle) || relativ.endsWith('.spec.ts')) {
    continue;
  }

  const komponente = basename(pfad, '.ts');
  if (basename(dirname(pfad)) !== komponente) {
    fehler.push(
      `${relativ}: component must live in its own folder \`${komponente}/\`; ` +
        `move it to \`${relative(wurzel, join(dirname(pfad), komponente, komponente)).replaceAll('\\', '/')}.ts\`.`,
    );
  }

  const basis = pfad.replace(/\.ts$/, '');
  for (const [endung, eigenschaft] of [
    ['.html', 'templateUrl'],
    ['.scss', 'styleUrl'],
    ['.spec.ts', 'a test file'],
  ]) {
    if (!existsSync(`${basis}${endung}`)) {
      fehler.push(
        `${relativ}: missing ${eigenschaft} (\`${relative(wurzel, basis).replaceAll('\\', '/')}${endung}\`).`,
      );
    }
  }
  if (!/templateUrl\s*:/.test(quelle)) {
    fehler.push(`${relativ}: missing \`templateUrl\`.`);
  }
  if (!/styleUrl\s*:/.test(quelle)) {
    fehler.push(`${relativ}: missing \`styleUrl\`.`);
  }
}

if (fehler.length > 0) {
  console.error('Component structure check failed:\n');
  for (const eintrag of fehler) {
    console.error(`  - ${eintrag}`);
  }
  process.exit(1);
}

console.log(`Component structure check passed (${tsDateien.length} TypeScript files under src/).`);
