# Place this file at: apps/api/app/services/parser.py
#
# Requires: pip install tree-sitter-language-pack

from pathlib import Path
from tree_sitter_language_pack import get_parser

REJECT_DIRS = {".git", "node_modules", "dist", "build", ".next", "vendor", "__pycache__"}

EXTENSION_LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".go": "go",
}

# Which AST node types count as a "definition" per language
DEFINITION_NODE_TYPES = {
    "python": {"function_definition", "class_definition"},
    "javascript": {"function_declaration", "class_declaration", "method_definition"},
    "typescript": {"function_declaration", "class_declaration", "method_definition"},
    "tsx": {"function_declaration", "class_declaration", "method_definition"},
    "go": {"function_declaration", "method_declaration", "type_declaration"},
}


def walk_source_files(root: Path):
    """Recursively yield source files under root, skipping REJECT_DIRS at any depth."""
    for path in root.rglob("*"):
        if path.is_dir():
            continue
        if any(part in REJECT_DIRS for part in path.parts):
            continue
        if path.suffix in EXTENSION_LANGUAGE_MAP:
            yield path


def extract_definitions(path: Path) -> list[dict]:
    """Parse a single source file and return its top-level function/class definitions."""
    language = EXTENSION_LANGUAGE_MAP[path.suffix]
    parser = get_parser(language)
    source_bytes = path.read_bytes()
    tree = parser.parse(source_bytes)

    def_types = DEFINITION_NODE_TYPES[language]
    definitions: list[dict] = []

    def visit(node):
        if node.type in def_types:
            name_node = node.child_by_field_name("name")
            name = (
                source_bytes[name_node.start_byte:name_node.end_byte].decode()
                if name_node
                else "<anonymous>"
            )
            definitions.append(
                {
                    "type": node.type,
                    "name": name,
                    "start_line": node.start_point[0] + 1,
                    "end_line": node.end_point[0] + 1,
                }
            )
        for child in node.children:
            visit(child)

    visit(tree.root_node)
    return definitions


if __name__ == "__main__":
    # Quick manual test — update repo_path to point at your extracted test repo.
    repo_path = Path("data/repos/107482ca-a425-4527-a883-43f90c92a2c8/test-repo")

    for file in walk_source_files(repo_path):
        defs = extract_definitions(file)
        if defs:
            print(file)
            for d in defs:
                print(f"  {d['type']} {d['name']} (lines {d['start_line']}-{d['end_line']})")