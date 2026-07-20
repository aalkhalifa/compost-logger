// Regenerates the extracted code fixtures that c-merge-equivalence.js compares against.
//
// That suite proves the shared mergeCloudData() still behaves EXACTLY like the two
// separate Drive merge blocks it replaced in Group C (v3.79r). To do that it needs the
// pre-extraction code, which only exists in git history - hence this step.
//
//   node test/prepare.js        # writes test/.fixtures/*.js  (gitignored)
//
// PRE_C is the last commit before Group C extracted the merge: "Group A: stand up
// PocketBase on the DO box". If history is ever rewritten, repoint this at whatever
// commit still contains initDriveStorage's and driveSaveNow's own inline merge blocks.
const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const PRE_C = '85ade7f';
const OUT = path.join(__dirname, '.fixtures');
const REPO = path.join(__dirname, '..');

function block(src, start, end) {
  const i = src.indexOf(start);
  if (i < 0) throw new Error('not found: ' + start);
  const j = src.indexOf(end, i) + end.length;
  return src.slice(i, j);
}

fs.mkdirSync(OUT, {recursive: true});

const old = execSync(`git -C ${REPO} show ${PRE_C}:beta/index.html`, {maxBuffer: 64 * 1024 * 1024}).toString();
const now = fs.readFileSync(path.join(REPO, 'beta/index.html'), 'utf8');

fs.writeFileSync(path.join(OUT, 'old_connect.js'),
  'function OLD_CONNECT(d){\n' + block(old, 'var drivePiles=d.piles||[];', 'migrateSites();') + '\n}\n');
fs.writeFileSync(path.join(OUT, 'old_sync.js'),
  'function OLD_SYNC(d){\n' + block(old, 'var drivePiles2=d.piles||[];', 'migrateSites();') + '\n}\n');
fs.writeFileSync(path.join(OUT, 'migrate.js'),
  block(old, 'function migrateSites(){', '\n}') + '\n');
fs.writeFileSync(path.join(OUT, 'new_merge.js'),
  block(now, 'function mergeCloudData(remote,opts){', '\n  migrateSites();\n}') + '\n');

console.log('fixtures written to test/.fixtures/ (from ' + PRE_C + ' and current beta/index.html)');
