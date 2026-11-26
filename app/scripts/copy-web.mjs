// Builds www/, which Capacitor packs into the APK, from the phone app in ../mobile.
// The website (../frontend) is NOT the app; we only borrow its fonts and the demo-mode sample data.
// backend/config/auth.json (public sign-in client IDs) is copied as www/auth.json, so sign-in buttons
// work even before a server is connected.
import { cpSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const out = join(here, '..', 'www');
if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync(out, { recursive: true });

cpSync(join(repo, 'mobile'), out, { recursive: true });
cpSync(join(repo, 'frontend', 'fonts'), join(out, 'fonts'), { recursive: true });
for (const f of ['demo.js', 'demo-dictionary.js']) cpSync(join(repo, 'frontend', 'js', f), join(out, 'js', f));
cpSync(join(repo, 'backend', 'config', 'auth.json'), join(out, 'auth.json'));
console.log('www/ <- mobile/ (+ fonts, demo data, auth.json)');
