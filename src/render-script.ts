import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

/** Languages available for the fenced code block. */
const SUPPORTED_LANGUAGES: readonly string[] = [
  "bash",
  "javascript",
  "typescript",
  "python",
  "ruby",
  "go",
  "rust",
  "java",
  "c",
  "cpp",
  "csharp",
  "json",
  "yaml",
  "html",
  "css",
  "sql",
  "plaintext",
] as const;

/**
 * Prompt the user for a file path and a language, read the file,
 * and render it as a fenced markdown code block.
 */
async function main(): Promise<void> {
  const rl = readline.createInterface({ input, output });

  try {
    const filePath = await rl.question("Enter the path to a script or file: ");
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

    console.log(`\nSupported languages: ${SUPPORTED_LANGUAGES.join(", ")}`);
    const langAnswer = await rl.question(
      "Enter the language for syntax highlighting (default: bash): ",
    );
    const language = langAnswer.trim().toLowerCase() || "bash";

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      console.error(
        `Warning: "${language}" is not in the supported list. Using it anyway.`,
      );
    }

    const content = fs.readFileSync(trimmed, "utf-8");
    const fileName = path.basename(trimmed);

    const markdown = renderAsMarkdown(fileName, content, language);
    console.log(markdown);
  } finally {
    rl.close();
  }
}

/**
 * Render a file's content as a fenced markdown code block with the given language.
 */
function renderAsMarkdown(
  fileName: string,
  content: string,
  language: string,
): string {
  const lines: string[] = [
    `## ${fileName}`,
    "",
    `\`\`\`${language}`,
    content.trimEnd(),
    "```",
    "",
  ];
  return lines.join("\n");
}

main().catch((err: unknown) => {
  console.error("Unexpected error:", err);
  process.exitCode = 1;
});
