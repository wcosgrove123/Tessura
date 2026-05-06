/**
 * apply-who-import.cjs
 *
 * Replaces the old "who-no-power" section in projects.js with the
 * newly ingested version from who-section-import.json.
 */

const fs = require("fs");
const path = require("path");

const PROJECTS_PATH = path.resolve(__dirname, "../src/data/projects.js");
const IMPORT_PATH = path.resolve(__dirname, "../src/data/who-section-import.json");

// Read the import data
const importData = JSON.parse(fs.readFileSync(IMPORT_PATH, "utf-8"));
const newSection = importData.section;

// Read projects.js as text, extract the data
const projectsText = fs.readFileSync(PROJECTS_PATH, "utf-8");

// Projects.js exports an array — we need to parse it.
// It's a JS file with `export default [...]` so we can't JSON.parse it directly.
// Instead, we'll use a different approach: modify the live data via a loader script.

console.log("New WHO section ready:");
console.log(`  Title: ${newSection.title}`);
console.log(`  ID: ${newSection.id}`);
console.log(`  Children: ${newSection.children.length}`);
console.log(`  Total paragraphs: ${countParas(newSection)}`);

function countParas(s) {
  let c = (s.paragraphs || []).length;
  for (const ch of s.children || []) c += countParas(ch);
  return c;
}

// Print the section tree for verification
function printTree(s, d = 0) {
  console.log("  ".repeat(d) + `${s.title} (${s.id}) — ${(s.paragraphs||[]).length}¶`);
  for (const ch of s.children || []) printTree(ch, d + 1);
}
printTree(newSection);

console.log("\nTo apply this import, paste this into the browser console while Tessera is running:");
console.log("────────────────────────────────────────────────────────────");
console.log(`
// Load the new WHO section data
const newSection = ${JSON.stringify(newSection)};

// Find and replace the who-no-power section in the projects tree
function replaceSection(parts, targetId, newData) {
  return parts.map(part => ({
    ...part,
    children: replaceSectionInChildren(part.children || [], targetId, newData),
  }));
}
function replaceSectionInChildren(children, targetId, newData) {
  return children.map(child => {
    if (child.id === targetId) return newData;
    if (child.children?.length) {
      return { ...child, children: replaceSectionInChildren(child.children, targetId, newData) };
    }
    return child;
  });
}

// Apply — this uses the React state setter exposed on window for dev
// First, let's check the current state
const currentProjects = JSON.parse(localStorage.getItem("tessera-workspace"));
if (currentProjects?.projects) {
  const updated = currentProjects.projects.map(p => {
    if (p.id !== "purpose-of-schools") return p;
    return { ...p, parts: replaceSection(p.parts, "who-no-power", newSection) };
  });
  currentProjects.projects = updated;
  localStorage.setItem("tessera-workspace", JSON.stringify(currentProjects));
  console.log("Done! Reload the page to see the updated WHO section.");
} else {
  console.error("Could not find tessera-workspace in localStorage");
}
`.trim());
console.log("────────────────────────────────────────────────────────────");
