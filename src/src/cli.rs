//! Command-line argument definitions for `itunes-dedup`.

use clap::{Parser, ValueEnum};
use std::path::PathBuf;

/// Scan an iTunes music library directory for duplicate files.
///
/// Supports three duplicate detection modes:
///   exact      – files match on content hash AND metadata
///   contents   – files match on content hash only (ignoring tags)
///   metadata   – files match on artist + album + title + track number
#[derive(Parser, Debug)]
#[command(name = "itunes-dedup", version, about)]
pub struct Cli {
    /// Root directory of the iTunes music library to scan.
    #[arg(value_name = "DIRECTORY")]
    pub directory: PathBuf,

    /// How to determine duplicates.
    #[arg(short, long, value_enum, default_value_t = DuplicateMode::Exact)]
    pub mode: DuplicateMode,

    /// Output results as JSON instead of human-readable text.
    #[arg(long)]
    pub json: bool,

    /// Only show groups with more than N duplicates (default: 2, i.e. at least one duplicate).
    #[arg(long, default_value_t = 2)]
    pub min_group_size: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, ValueEnum)]
pub enum DuplicateMode {
    /// Match files by both content hash and metadata.
    Exact,
    /// Match files only by content hash (SHA-256 of audio data).
    Contents,
    /// Match files only by metadata (artist, album, title, track#).
    Metadata,
}
