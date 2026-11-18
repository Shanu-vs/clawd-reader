use std::path::PathBuf;

const MARKDOWN_EXTENSIONS: [&str; 6] = ["md", "markdown", "mdown", "mkd", "mkdn", "txt"];
const IMAGE_EXTENSIONS: [&str; 9] = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif", "ico"];

fn has_extension(path: &PathBuf, allowed: &[&str]) -> bool {
  path
    .extension()
    .and_then(|e| e.to_str())
    .map(|e| allowed.contains(&e.to_ascii_lowercase().as_str()))
    .unwrap_or(false)
}

/// Read a Markdown file by its full path.
#[tauri::command]
fn read_markdown(path: String) -> Result<String, String> {
  let path = PathBuf::from(path);
  if !has_extension(&path, &MARKDOWN_EXTENSIONS) {
    return Err("Only Markdown or text files can be opened.".into());
  }
  std::fs::read_to_string(&path).map_err(|e| format!("Couldn't read the file: {e}"))
}

/// Save a Markdown file. Writes to a temporary file first and then swaps it in,
/// so a crash or full disk never leaves a half-written document behind.
#[tauri::command]
fn write_markdown(path: String, contents: String) -> Result<(), String> {
  let path = PathBuf::from(path);
  if !has_extension(&path, &MARKDOWN_EXTENSIONS) {
    return Err("Documents can only be saved as Markdown or text files.".into());
  }
  let mut tmp = path.clone().into_os_string();
  tmp.push(".saving");
  let tmp = PathBuf::from(tmp);
  std::fs::write(&tmp, contents).map_err(|e| format!("Couldn't save the file: {e}"))?;
  std::fs::rename(&tmp, &path).map_err(|e| {
    let _ = std::fs::remove_file(&tmp);
    format!("Couldn't save the file: {e}")
  })
}

/// Read an image referenced by a document, straight from its location on disk.
#[tauri::command]
fn read_image(path: String) -> Result<tauri::ipc::Response, String> {
  let path = PathBuf::from(path);
  if !has_extension(&path, &IMAGE_EXTENSIONS) {
    return Err("Not an image file.".into());
  }
  let bytes = std::fs::read(&path).map_err(|e| format!("Couldn't read the image: {e}"))?;
  Ok(tauri::ipc::Response::new(bytes))
}

/// A Markdown file passed on the command line (e.g. "Open with" or double-click), if any.
#[tauri::command]
fn startup_file() -> Option<String> {
  std::env::args_os()
    .skip(1)
    .map(PathBuf::from)
    .find(|p| has_extension(p, &MARKDOWN_EXTENSIONS) && p.is_file())
    .map(|p| p.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![read_markdown, write_markdown, read_image, startup_file])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
