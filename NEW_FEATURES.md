# New Features

Potential features and improvements that could be added to this repository.

## itunes-dedup

### Interactive deletion mode

Currently `itunes-dedup` only *reports* duplicates. An interactive mode
(`--interactive` / `-i`) could prompt the user to choose which copy to keep and
delete the rest, with an optional `--dry-run` flag for previewing what would be
removed.

### CSV / TSV output format

In addition to JSON and plain text, a `--format csv` option would make it easy
to open results in a spreadsheet or pipe them into other Unix tools.

### Fuzzy metadata matching

The metadata mode today requires an exact (case-insensitive) match on artist,
album, title, and track number. A fuzzy matching mode (e.g. Levenshtein
distance or phonetic matching) could catch near-duplicates caused by minor
tagging differences such as "The Beatles" vs. "Beatles, The".

### Configurable hash algorithm

SHA-256 is the only hash today. Allowing the user to choose a faster
alternative like BLAKE3 (`--hash blake3`) could significantly speed up large
library scans while still providing collision resistance.

### Progress bar

For large libraries the scan can take a while with no visible feedback beyond
the initial file count. Integrating a progress bar (e.g. via the `indicatif`
crate) would give real-time feedback during hashing and metadata extraction.

### Ignore list / exclusion patterns

A `--exclude` flag or a `.dedup-ignore` config file could let users skip
certain directories or filename patterns (e.g. podcasts, audiobooks) without
having to reorganise their library.

### Duplicate resolution report

After a run, the tool could generate a summary report (Markdown or HTML)
listing total space recoverable, duplicate counts per artist/album, and
before/after statistics — useful for sharing or record-keeping.

### Apple Music API integration

Rather than scanning the filesystem, the tool could optionally read the
Apple Music / iTunes library XML or database file directly to correlate
filesystem entries with library metadata, enabling smarter decisions about
which copy is the "canonical" one.

## Install scripts

### Idempotent installs

`install.sh` currently appends to `~/.bashrc` on every run. Making the script
idempotent — detecting whether the block has already been added and skipping it
if so — would prevent duplicated shell configuration.

### Uninstall / rollback script

An `uninstall.sh` that reverses the changes made by the install scripts
(removes the bashrc block, deletes `~/.copilot/`) would make it safer to
experiment with the dotfiles.

### OS detection and conditional setup

The install scripts could detect the operating system (macOS vs. Linux vs. WSL)
and apply platform-specific configuration automatically, such as different
clipboard utilities or path conventions.

### Dotfile manager integration

Integrating with a dotfile manager such as GNU Stow or chezmoi would enable
symlink-based management, version tracking of individual config files, and
easier multi-machine synchronisation.

## General

### Automated tests

Adding a test suite — Rust unit/integration tests for `itunes-dedup` and
ShellCheck / BATS tests for the shell scripts — would catch regressions early
and make it safer to accept contributions.

### CI / CD pipeline

A GitHub Actions workflow that runs `cargo clippy`, `cargo test`, `cargo fmt
--check`, and ShellCheck on every push would enforce code quality
automatically.

### Broader dotfile coverage

The repository currently focuses on Copilot instructions and Codespaces
helpers. Expanding it to manage additional dotfiles (e.g. `.gitconfig`,
`.vimrc`, `.tmux.conf`, shell aliases) would make it a more complete
personal-environment bootstrap.
