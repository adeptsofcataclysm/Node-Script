import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientRoot = path.resolve(artifactDir, "..", "game-client", "src", "apps");

const apps = {
  1: "adepts-game",
  2: "adepts-game-2",
  3: "adepts-game-3",
};

const boardId = Number(process.argv[2] ?? "1");
if (!apps[boardId]) {
  console.error("Usage: node extract-default-board.mjs <1|2|3>");
  process.exit(1);
}

const clientPath = path.join(
  clientRoot,
  apps[boardId],
  "hooks",
  "useGameState.ts",
);
const outPath = path.join(
  artifactDir,
  "src",
  "lib",
  `default-adepts-quiz-board-${boardId}.json`,
);

const s = fs.readFileSync(clientPath, "utf8");
const start = s.indexOf("const DEFAULT_STATE: GameState = ");
if (start < 0) {
  console.error("const DEFAULT_STATE not found in", clientPath);
  process.exit(1);
}
const brace = s.indexOf("{", start);
let depth = 0;
let i = brace;
for (; i < s.length; i++) {
  const c = s[i];
  if (c === "{") depth++;
  else if (c === "}") {
    depth--;
    if (depth === 0) {
      i++;
      break;
    }
  }
}
const objSrc = s.slice(brace, i);
function gd(id) {
  return `https://drive.google.com/uc?export=view&id=${id}`;
}
const DEFAULT_STATE = new Function("gd", `return ${objSrc}`)(gd);
const { themes, questions } = DEFAULT_STATE;
const questionsOut = questions.map((row) =>
  row.map((q) => {
    const { used: _u, ...rest } = q;
    return rest;
  }),
);
const payload = { themes, questions: questionsOut };
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
console.log("wrote", outPath);
