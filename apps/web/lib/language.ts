// File extension → Prism grammar id. Only grammars that prism-react-renderer
// ships are listed; anything else renders as plain (uncolored) text.
const BY_EXTENSION: Record<string, string> = {
  py: "python",
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  css: "css",
  html: "markup",
  xml: "markup",
  svg: "markup",
  md: "markdown",
  mdx: "markdown",
  yml: "yaml",
  yaml: "yaml",
  go: "go",
  rs: "rust",
  java: "clike",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  hpp: "cpp",
  kt: "kotlin",
  swift: "swift",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
}

export function languageFromPath(path: string): {
  grammar: string
  label: string
} {
  const ext = path.includes(".")
    ? (path.split(".").pop() ?? "").toLowerCase()
    : ""
  return {
    grammar: BY_EXTENSION[ext] ?? "plain",
    label: ext ? ext.toUpperCase() : "TEXT",
  }
}
