use crate::cli::DuplicateMode;
use crate::hasher::sha256_of_file;
use crate::metadata::{read_metadata, AudioMetadata};
use rayon::prelude::*;
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

/// All the information we collect for a single audio file.
#[derive(Debug, Clone, Serialize)]
pub struct FileInfo {
    pub path: PathBuf,
    pub size: u64,
    pub content_hash: Option<String>,
    pub metadata: Option<AudioMetadata>,
}

/// A group of files that are considered duplicates under some mode.
#[derive(Debug, Serialize)]
pub struct DuplicateGroup {
    /// The key that all members share (for display / JSON output).
    pub key: String,
    pub files: Vec<FileInfo>,
}

// ── helpers ──────────────────────────────────────────────────────────

/// Derive the grouping key for a file depending on the chosen mode.
fn grouping_key(info: &FileInfo, mode: DuplicateMode) -> Option<String> {
    match mode {
        DuplicateMode::Exact => {
            let hash = info.content_hash.as_ref()?;
            let meta = info.metadata.as_ref()?;
            Some(format!(
                "{}|{}|{}|{}|{}",
                hash,
                meta.artist.as_deref().unwrap_or(""),
                meta.album.as_deref().unwrap_or(""),
                meta.title.as_deref().unwrap_or(""),
                meta.track_number.unwrap_or(0),
            ))
        }
        DuplicateMode::Contents => info.content_hash.clone(),
        DuplicateMode::Metadata => {
            let meta = info.metadata.as_ref()?;
            // Require at least artist+title to avoid grouping files that
            // simply have *no* metadata at all.
            if meta.artist.is_none() && meta.title.is_none() {
                return None;
            }
            Some(format!(
                "{}|{}|{}|{}",
                meta.artist.as_deref().unwrap_or(""),
                meta.album.as_deref().unwrap_or(""),
                meta.title.as_deref().unwrap_or(""),
                meta.track_number.unwrap_or(0),
            ))
        }
    }
}

// ── public API ───────────────────────────────────────────────────────

/// Build [`FileInfo`] records for every path, collecting only the data
/// required by `mode`.
///
/// ## Efficiency strategy
///
/// 1. **Size pre-filter (contents / exact modes):** files with a unique
///    size on disk can never be content-duplicates, so we skip the
///    expensive SHA-256 pass for them.
/// 2. **Parallel hashing & metadata extraction** via Rayon.
/// 3. **Streaming SHA-256** so memory stays bounded regardless of file
///    size (see `hasher` module).
pub fn analyse(paths: &[PathBuf], mode: DuplicateMode) -> Vec<FileInfo> {
    let needs_hash = matches!(mode, DuplicateMode::Exact | DuplicateMode::Contents);
    let needs_meta = matches!(mode, DuplicateMode::Exact | DuplicateMode::Metadata);

    // --- Step 1: cheap stat pass (file sizes) -------------------------
    let sized: Vec<(PathBuf, u64)> = paths
        .iter()
        .filter_map(|p| {
            let meta = fs::metadata(p).ok()?;
            Some((p.clone(), meta.len()))
        })
        .collect();

    // --- Step 2: size pre-filter (skip unique sizes when hashing) -----
    let hash_candidates: std::collections::HashSet<u64> = if needs_hash {
        let mut counts: HashMap<u64, usize> = HashMap::new();
        for &(_, size) in &sized {
            *counts.entry(size).or_default() += 1;
        }
        counts
            .into_iter()
            .filter(|&(_, count)| count > 1)
            .map(|(size, _)| size)
            .collect()
    } else {
        std::collections::HashSet::new()
    };

    // --- Step 3: parallel extraction ----------------------------------
    sized
        .into_par_iter()
        .map(|(path, size)| {
            let content_hash = if needs_hash && hash_candidates.contains(&size) {
                sha256_of_file(&path).ok()
            } else {
                None
            };

            let metadata = if needs_meta {
                read_metadata(&path)
            } else {
                None
            };

            FileInfo {
                path,
                size,
                content_hash,
                metadata,
            }
        })
        .collect()
}

/// Group the analysed files into duplicate groups.
pub fn find_duplicates(
    infos: Vec<FileInfo>,
    mode: DuplicateMode,
    min_group_size: usize,
) -> Vec<DuplicateGroup> {
    let mut groups: HashMap<String, Vec<FileInfo>> = HashMap::new();

    for info in infos {
        if let Some(key) = grouping_key(&info, mode) {
            groups.entry(key).or_default().push(info);
        }
    }

    let mut result: Vec<DuplicateGroup> = groups
        .into_iter()
        .filter(|(_, files)| files.len() >= min_group_size)
        .map(|(key, files)| DuplicateGroup { key, files })
        .collect();

    // Deterministic output order.
    result.sort_by(|a, b| a.key.cmp(&b.key));
    result
}
