use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{self, BufReader, Read};
use std::path::Path;

/// Size of the read buffer (64 KiB). Keeps memory usage low while
/// still allowing efficient sequential reads.
const BUF_SIZE: usize = 64 * 1024;

/// Compute the SHA-256 digest of the full file contents at `path`.
///
/// Uses buffered, streaming reads so that even very large files never
/// need to be held in memory all at once.
pub fn sha256_of_file(path: &Path) -> io::Result<String> {
    let file = File::open(path)?;
    let mut reader = BufReader::with_capacity(BUF_SIZE, file);
    let mut hasher = Sha256::new();
    let mut buf = [0u8; BUF_SIZE];

    loop {
        let n = reader.read(&mut buf)?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}
