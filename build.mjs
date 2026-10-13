import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const item of ['index.html', 'main.js', 'js', 'styles']) {
  await cp(path.join(root, item), path.join(output, item), { recursive: true });
}
for (const item of ['manus-routes.json', 'favicon.svg']) {
  await cp(path.join(root, 'public', item), path.join(output, item));
}

console.log(`Static site built in ${path.relative(root, output)}`);
