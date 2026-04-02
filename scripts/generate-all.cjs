/**
 * Master orchestration script — runs the full import pipeline.
 *
 * 1. Import Axiometric Calculus from .docx
 * 2. Import Ontological Dictionary from .docx
 * 3. Expand linked terms from both imports
 * 4. Generate combined projects.js
 * 5. Scan cross-references across all projects
 *
 * Usage: node scripts/generate-all.cjs
 *        npm run import:all
 */

const { execSync } = require('child_process');
const path = require('path');

const SCRIPTS_DIR = __dirname;

function run(scriptName, description) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Step: ${description}`);
  console.log(`${'='.repeat(60)}`);
  execSync(`node "${scriptPath}"`, { stdio: 'inherit', cwd: path.join(SCRIPTS_DIR, '..') });
}

console.log('Tessera Import Pipeline');
console.log('=======================\n');

const start = Date.now();

try {
  run('import-axiometric-calculus.cjs', 'Import Axiometric Calculus v4');
  run('import-ontological-dictionary.cjs', 'Import Ontological Dictionary');
  run('expand-linked-terms.cjs', 'Expand linked terms (8 → ~47)');
  run('generate-projects-combined.cjs', 'Generate combined projects.js');
  run('scan-cross-refs.cjs', 'Scan cross-references');

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Pipeline complete in ${elapsed}s`);
  console.log(`${'='.repeat(60)}`);
  console.log('\nNext steps:');
  console.log('  1. Clear localStorage: localStorage.removeItem("tessera-workspace")');
  console.log('  2. Run: npm run dev');
  console.log('  3. Verify all 3 projects in the sidebar');
} catch (err) {
  console.error('\nPipeline failed:', err.message);
  process.exit(1);
}
