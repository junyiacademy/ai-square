// Test file for Claude Auto-Fix in AI Square monorepo
// Deliberately broken code with multiple lint errors

const unusedVariable = "test"; // Extra spaces + unused
let anotherUnused = 123; // Missing semicolon

function badlyFormatted() {
  // Extra spaces
  console.log("bad formatting"); // Inconsistent indent
  return "test"; // Extra spaces
}

const obj = { key: "value", another: "value" }; // Missing spaces
const arr = [1, 2, 3, 4, 5]; // Missing spaces

// Unused function
function neverCalled() {
  return 42;
}

export {}; // Prevent non-module error
