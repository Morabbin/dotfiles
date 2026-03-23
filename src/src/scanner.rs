use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Known audio file extensions found in iTunes libraries.
const AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "m4a", "m4p", "aac", "aiff", "aif", "wav", "flac", "alac", "ogg",
];

/// Walk `root` and return paths to all audio files.
pub fn scan_audio_files(root: &Path) -> Vec<PathBuf> {
    WalkDir::new(root)
        .follow_links(true)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.file_type().is_file())
        .filter(|entry| {
            entry
                .path()
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| AUDIO_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
                .unwrap_or(false)
        })
        .map(|entry| entry.into_path())
        .collect()
}
