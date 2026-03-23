use crate::dedup::DuplicateGroup;
use std::io::{self, Write};

/// Print duplicate groups as JSON.
pub fn print_json(groups: &[DuplicateGroup], out: impl Write) -> io::Result<()> {
    serde_json::to_writer_pretty(out, groups)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))
}

/// Print duplicate groups as human-readable text.
pub fn print_text(groups: &[DuplicateGroup], mut out: impl Write) -> io::Result<()> {
    if groups.is_empty() {
        writeln!(out, "No duplicates found.")?;
        return Ok(());
    }

    writeln!(
        out,
        "Found {} duplicate group(s):\n",
        groups.len()
    )?;

    for (i, group) in groups.iter().enumerate() {
        writeln!(out, "── Group {} ({} files) ──", i + 1, group.files.len())?;
        for file in &group.files {
            writeln!(out, "  {}", file.path.display())?;

            if let Some(ref meta) = file.metadata {
                let parts: Vec<String> = [
                    meta.artist.as_deref().map(|s| format!("artist={s}")),
                    meta.album.as_deref().map(|s| format!("album={s}")),
                    meta.title.as_deref().map(|s| format!("title={s}")),
                    meta.track_number.map(|n| format!("track={n}")),
                ]
                .into_iter()
                .flatten()
                .collect();

                if !parts.is_empty() {
                    writeln!(out, "    [{}]", parts.join(", "))?;
                }
            }

            if let Some(ref hash) = file.content_hash {
                writeln!(out, "    sha256={hash}")?;
            }
        }
        writeln!(out)?;
    }

    Ok(())
}
