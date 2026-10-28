// Wächter für das automatische Verbessern (PreToolUse auf Bash).
// - git commit: erst Typen + schnelle Tests, sonst blockieren.
// - git push nach main und eas update außerhalb der Kanäle „auto“/„preview“
//   blockieren (Nutzer, 2026-10-28: jede Änderung auch nach sdk-58 + preview).
// Exit 2 = blockieren (Meldung auf stderr geht an Claude).
import { execSync } from "node:child_process";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const cmd = (JSON.parse(raw || "{}").tool_input?.command ?? "").toString();

function block(msg) {
  process.stderr.write(msg + "\n");
  process.exit(2);
}

if (/\bgit\s+push\b/.test(cmd) && /\bmain\b/.test(cmd)) {
  block("Blockiert: Push nach main ist im Auto-Modus verboten (nur auto-improve und sdk-58).");
}
if (/\beas(-cli(@\S+)?)?\s+update\b/.test(cmd) && !/--channel[ =](auto|preview)\b/.test(cmd)) {
  block("Blockiert: eas update nur mit --channel auto oder preview.");
}
if (/\bgit\s+commit\b/.test(cmd)) {
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  for (const [name, c] of [
    ["Typprüfung", "npx tsc --noEmit -p ."],
    ["Tests", "npx jest --testPathIgnorePatterns tricks --silent"],
  ]) {
    try {
      execSync(c, { cwd, stdio: "pipe", timeout: 280000 });
    } catch (e) {
      const out = `${e.stdout ?? ""}${e.stderr ?? ""}`.slice(-3000);
      block(`Commit blockiert – ${name} fehlgeschlagen:\n${out}`);
    }
  }
}
process.exit(0);
