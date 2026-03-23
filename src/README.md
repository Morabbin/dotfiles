# itunes-dedup

A command-line tool that scans an iTunes music library directory for duplicate audio files.

## Duplicate Detection Modes

| Mode | Flag | Matches on |
|------|------|-----------|
| **Exact** (default) | `-m exact` | Content SHA-256 hash **and** metadata (artist, album, title, track#) |
| **Contents** | `-m contents` | Content SHA-256 hash only (ignores tags) |
| **Metadata** | `-m metadata` | Metadata only (artist, album, title, track#) |

## Efficiency Strategy

1. **Size pre-filter** – Files with a unique size on disk can never be content-duplicates, so the expensive SHA-256 pass is skipped for them entirely.
2. **Parallel processing** – Hashing and metadata extraction run in parallel across all CPU cores via [Rayon](https://docs.rs/rayon).
3. **Streaming SHA-256** – Files are hashed in 64 KiB chunks so memory stays bounded regardless of file size.
4. **Lazy data collection** – Only the data needed for the chosen mode is collected (e.g. metadata-only mode skips hashing entirely).

## Usage

```bash
# Scan with default (exact) mode
itunes-dedup /path/to/iTunes/Music

# Content-only duplicates, JSON output
itunes-dedup -m contents --json /path/to/iTunes/Music

# Metadata-only duplicates
itunes-dedup -m metadata /path/to/iTunes/Music
```

## Supported Formats

mp3, m4a, m4p, aac, aiff, aif, wav, flac, alac, ogg

## Building

```bash
cd src
cargo build --release
```
