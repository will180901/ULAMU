/**
 * OTA (#12) — publie une mise à jour JS sans redistribuer l'APK.
 * Étapes : bundle JS release → compilation Hermes (.hbc, obligatoire car hermesEnabled) → zip →
 * dépôt dans apps/api/ota/bundle-vN.zip → bump apps/api/ota/manifest.json (version + url).
 * Ensuite : git add/commit (amend) + force push → Render redéploie → l'app récupère la MAJ au prochain lancement.
 *
 * Lancer depuis apps/mobile :  node scripts/ota-publish.js
 * Pré-requis : exécuté à la racine apps/mobile (node_modules/react-native présent).
 */
const {execSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const MOBILE = path.resolve(__dirname, '..');
const OTA_DIR = path.resolve(MOBILE, '../api/ota');
const PROD_BASE = 'https://ulamu-api.onrender.com';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ulamu-ota-'));

function hermesc() {
  const base = path.join(MOBILE, 'node_modules', 'react-native', 'sdks', 'hermesc');
  const candidates = [
    ['win64-bin', 'hermesc.exe'],
    ['osx-bin', 'hermesc'],
    ['linux64-bin', 'hermesc'],
  ].map(([d, b]) => path.join(base, d, b));
  const found = candidates.find(fs.existsSync);
  if (!found) {
    throw new Error('hermesc introuvable sous node_modules/react-native/sdks/hermesc');
  }
  return found;
}

function nextVersion() {
  const mf = path.join(OTA_DIR, 'manifest.json');
  let v = 0;
  try {
    v = Number(JSON.parse(fs.readFileSync(mf, 'utf8')).version) || 0;
  } catch {
    /* manifest absent → on part de 0 */
  }
  return v + 1;
}

function main() {
  const version = nextVersion();
  console.log(`OTA publish — nouvelle version ${version}`);

  const plainBundle = path.join(TMP, 'index.android.bundle');
  const assets = path.join(TMP, 'assets');
  fs.mkdirSync(assets, {recursive: true});

  console.log('1/4  bundle JS release…');
  execSync(
    `npx react-native bundle --platform android --dev false --entry-file index.js ` +
      `--bundle-output "${plainBundle}" --assets-dest "${assets}"`,
    {cwd: MOBILE, stdio: 'inherit'},
  );

  console.log('2/4  compilation Hermes (.hbc)…');
  const hbc = path.join(TMP, 'index.android.bundle.hbc');
  execSync(`"${hermesc()}" -emit-binary -O -out "${hbc}" "${plainBundle}"`, {stdio: 'inherit'});

  console.log('3/4  zip…');
  const packDir = path.join(TMP, 'pack');
  fs.mkdirSync(packDir, {recursive: true});
  // Le bundle Hermes doit garder le nom attendu par le natif.
  fs.copyFileSync(hbc, path.join(packDir, 'index.android.bundle'));
  if (fs.existsSync(assets)) {
    fs.cpSync(assets, path.join(packDir, 'assets'), {recursive: true});
  }
  fs.mkdirSync(OTA_DIR, {recursive: true});
  const zipName = `bundle-v${version}.zip`;
  const zipPath = path.join(OTA_DIR, zipName);
  // PowerShell Compress-Archive (Windows) — zippe le CONTENU de packDir.
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${packDir}\\*' -DestinationPath '${zipPath}' -Force"`,
    {stdio: 'inherit'},
  );

  console.log('4/4  mise à jour du manifeste…');
  fs.writeFileSync(
    path.join(OTA_DIR, 'manifest.json'),
    JSON.stringify({version, url: `${PROD_BASE}/ota/android/bundle/${zipName}`}, null, 2) + '\n',
  );

  console.log(`\n✅ OTA v${version} prêt : ${zipPath}`);
  console.log('   Puis : git add -A && git commit --amend --no-edit && git push --force origin main');
  console.log('   (Render redéploie ; l\'app récupère la MAJ au prochain lancement.)');
}

main();
