# Contributing

Thank you for your interest in contributing to this project! Below are
guidelines to help keep the process smooth.

## Getting started

1. **Fork** the repository and create a feature branch from `main`.
2. Make your changes in small, focused commits.
3. Ensure any Rust code compiles cleanly:
   ```bash
   cd src
   cargo build
   cargo clippy -- -D warnings
   ```
4. Open a pull request with a clear description of the change.

## Code style

- **Rust** — follow standard `rustfmt` formatting (`cargo fmt`). All public
  items (functions, structs, enums, constants) should have `///` doc comments.
- **Shell scripts** — use `set -euo pipefail` where practical and quote all
  variable expansions.

## Commit messages

Write short, imperative-mood subject lines (e.g. "Add metadata-only dedup
mode"). Include a blank line and a longer description when the change is
non-trivial.

## Reporting issues

Open a GitHub issue describing the problem, including steps to reproduce and
any relevant error output.

## Pull request checklist

- [ ] Code compiles without warnings (`cargo clippy -- -D warnings`)
- [ ] Code is formatted (`cargo fmt --check`)
- [ ] New public items have doc comments
- [ ] Commit messages follow the conventions above
