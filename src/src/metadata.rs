//! Audio metadata extraction and normalization using the `lofty` crate.

use lofty::file::TaggedFileExt;
use lofty::tag::Accessor;
use serde::Serialize;
use std::path::Path;

/// Normalized metadata extracted from an audio file's tags.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize)]
pub struct AudioMetadata {
    pub artist: Option<String>,
    pub album: Option<String>,
    pub title: Option<String>,
    pub track_number: Option<u32>,
    pub genre: Option<String>,
}

/// Lowercase and trim whitespace so that minor formatting differences don't
/// prevent two files from being considered duplicates.
fn normalize(s: &str) -> String {
    s.trim().to_lowercase()
}

/// Try to read metadata from the file at `path`.
///
/// Returns `None` when the file cannot be parsed or contains no tags at all.
pub fn read_metadata(path: &Path) -> Option<AudioMetadata> {
    let tagged_file = lofty::read_from_path(path).ok()?;
    let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag())?;

    Some(AudioMetadata {
        artist: tag.artist().map(|s| normalize(s.as_ref())),
        album: tag.album().map(|s| normalize(s.as_ref())),
        title: tag.title().map(|s| normalize(s.as_ref())),
        track_number: tag.track(),
        genre: tag.genre().map(|s| normalize(s.as_ref())),
    })
}
