#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![launch_backend])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

use std::process::Command;

#[tauri::command]
fn launch_backend() {
  // println!("I was invoked from JS!");

  let output = if cfg!(target_os = "windows") {
      Command::new("cmd")
              .args(&["/C", "date"])
              .output()
              .expect("failed to execute process")
  } else {
      Command::new("sh")
              .arg("-c")
              .arg("date")
              .output()
              .expect("failed to execute process")
  };

  println!("status: {}", output.status);
  println!("{}", String::from_utf8_lossy(&output.stdout));
}