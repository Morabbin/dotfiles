import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

/**
 * Prompt the user for a shell script path, read it, and render it as markdown.
 */
async function main(): Promise<void> {
  const rl = readline.createInterface({ input, output });

  try {
    const filePath = await rl.question("Enter the path to a shell script: ");
    const trimmed = filePath.trim();

    if (!trimmed) {
      console.error("Error: no file path provided.");
      process.exitCode = 1;
      return;
    }

    if (!fs.existsSync(trimmed)) {
      console.error(`Error: file not found: ${trimmed}`);
      process.exitCode = 1;
      return;
    }

    const content = fs.readFileSync(trimmed, "utf-8");
    const fileName = path.basename(trimmed);

    const markdown = renderShellScriptAsMarkdown(fileName, content);
    console.log(markdown);
  } finally {
    rl.close();
  }
}

/**
 * Render a shell script's content as a fenced markdown code block.
 */
function renderShellScriptAsMarkdown(
  fileName: string,
  content: string,
): string {
  const lines: string[] = [
    `## ${fileName}`,
    "",
    "```bash",
    content.trimEnd(),
    "```",
    "",
  ];
  return lines.join("\n");
}

main();
