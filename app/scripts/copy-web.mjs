// Copies the website (../frontend) into www/, which Capacitor packs into the APK.
// The site itself is unchanged: the app is the same pages, served from inside the phone.
import { cpSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', 'frontend');
const out = join(here, '..', 'www');
if (existsSync(out)) rmSync(out, { recursive: true });
// Skip docs and the large demo-video folder: the app links to nothing in them.
const skip = /(\/README\.md|\/assets\/demo\/.*\.mp4)$/;
cpSync(src, out, { recursive: true, filter: p => !skip.test(p.replaceAll('\\', '/')) });
console.log('www/ <- frontend/');
