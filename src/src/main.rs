//! Entry point for the `itunes-dedup` CLI tool.
//!
//! Parses command-line arguments, orchestrates the scan → analyse → group →
//! report pipeline, and writes the results to stdout.

mod cli;
mod dedup;
mod hasher;
mod metadata;
mod report;
mod scanner;

use clap::Parser;
use cli::Cli;
use std::io;
use std::process;

fn main() {
    let args = Cli::parse();

    // Validate that the target directory exists.
    if !args.directory.is_dir() {
        eprintln!(
            "error: '{}' is not a directory or does not exist",
            args.directory.display()
        );
        process::exit(1);
    }

    eprintln!(
        "Scanning '{}' for audio files…",
        args.directory.display()
    );

    // 1. Discover audio files.
    let paths = scanner::scan_audio_files(&args.directory);
    eprintln!("Found {} audio file(s).", paths.len());

    if paths.is_empty() {
        process::exit(0);
    }

    // 2. Analyse (hash / read metadata) – with size pre-filter & parallelism.
    eprintln!("Analysing files (mode: {:?})…", args.mode);
    let infos = dedup::analyse(&paths, args.mode);

    // 3. Group duplicates.
    let groups = dedup::find_duplicates(infos, args.mode, args.min_group_size);

    // 4. Output results.
    let stdout = io::stdout();
    let out = stdout.lock();

    let result = if args.json {
        report::print_json(&groups, out)
    } else {
        report::print_text(&groups, out)
    };

    if let Err(e) = result {
        eprintln!("error writing output: {e}");
        process::exit(1);
    }
}
