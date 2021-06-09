#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::Manager;
use tauri::{CustomMenuItem, SystemTrayMenuItem};
// use tauri::api::path::resource_dir;
use std::sync::{Arc, Mutex};
use std::{env, thread, time};

fn main() {
  let quit = CustomMenuItem::new("quit".to_string(), "Quit");
  // let hide = CustomMenuItem::new("hide".to_string(), "Hide");
  let show = CustomMenuItem::new("show".to_string(), "Show");
  let use_browser = CustomMenuItem::new("useBrowser".to_string(), "Use Browser");
  let tray_menu_items = vec![
    SystemTrayMenuItem::Custom(use_browser),
    // SystemTrayMenuItem::Custom(hide),
    SystemTrayMenuItem::Custom(show),
    // SystemTrayMenuItem::Separator,
    SystemTrayMenuItem::Custom(quit),
  ];

  // launch
  let mut child = launch_backend();
  let pid = Arc::new(Mutex::new(child.id().to_string()));

  tauri::Builder::default()
    .system_tray(tray_menu_items)
    .on_system_tray_event(move |app, event| match event.menu_item_id().as_str() {
      "quit" => {
        // https://stackoverflow.com/questions/30559073/cannot-borrow-captured-outer-variable-in-an-fn-closure-as-mutable
        kill_pid(pid.lock().unwrap().to_string());
        std::process::exit(0);
      }
      "hide" => {
        let window = app.get_window("main").unwrap();
        window.hide().unwrap()
      }
      "show" => {
        let window = app.get_window("main").unwrap();
        window.show().unwrap()
      }
      "useBrowser" => {
        let window = app.get_window("main").unwrap();
        window.hide().unwrap();
        open_browser("5987".to_string());
      }
      _ => {}
    })
    .invoke_handler(tauri::generate_handler![kill_pid, get_cwd])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");

  child.kill().expect("could not kill process")
}

use std::process::{Child, Command};

// fn test_command() -> String {
//   // println!("I was invoked from JS!");
//   let mut pid : String = "".to_string();
//   if cfg!(target_os = "windows") {
//       let mut cmd = Command::new("cmd");
//       cmd.args(&["/C", "date"]);

//       let output = cmd.output()
//               .expect("failed to execute process");
//       println!("{}", String::from_utf8_lossy(&output.stdout));
//       // pid = child.id().to_string()
//   } else {
//       let mut cmd = Command::new("sh");
//       // cmd.arg("-c").arg("open https://google.com");
//       // cmd.arg("-c").arg("date");
//       // let output = cmd.output();
//       // println!("{}", String::from_utf8_lossy(&output.stdout));
//       let child = cmd.arg("-c").arg("sleep 2").spawn()
//         .expect("failed to execute process");
//       pid = child.id().to_string();
//     };

//     println!("PID {}",pid);
//     pid.into()
//   // println!("status: {}", output.status);
//   // println!("{}", String::from_utf8_lossy(&output.stdout));
// }

fn launch_backend() -> Child {
  // println!("I was invoked from JS!");
  let mut sh: String = "sh".to_string();
  let exe = env::current_exe().unwrap();
  let mut parent = exe.parent();
  let mut parent_folder = parent.as_mut().unwrap().to_string_lossy().to_string();

  let mut bin: String = "".to_string();
  let mut arg1: String = "-c".to_string();

  if cfg!(target_os = "windows") {
    sh = "cmd".to_string();
    arg1 = "/C".to_string();
    if parent_folder.contains("src-tauri") &&  parent_folder.ends_with("debug") {
      parent_folder = format!("{}\\..\\..\\..\\..", parent_folder);
    }
    bin = format!("{}\\dbnet-x86_64-pc-windows-msvc.exe", parent_folder);
  } else {
    if parent_folder.contains("src-tauri") &&  parent_folder.ends_with("debug") {
      parent_folder = format!("{}/../../../..", parent_folder);
    }
    bin = format!("{}/dbnet-x86_64-apple-darwin", parent_folder);
  }

  kill_process_by_name();

  println!("{}", &bin);
  let mut cmd = Command::new(&sh);
  let child = cmd
    .args(&[&arg1, &bin])
    .spawn()
    .expect("failed to execute process");
  thread::sleep(time::Duration::from_secs(2));
  child.into()
}

#[tauri::command]
fn get_cwd() -> String {
  // let mut path = env::current_dir();
  let exe = env::current_exe().unwrap();
  // exe.as_mut().unwrap().to_string_lossy().into();
  let mut parent = exe.parent();
  parent.as_mut().unwrap().to_string_lossy().into()

  // path.as_mut().unwrap().to_string_lossy().into()
  // let mut cmd = Command::new("sh");
  //   cmd.arg("-c").arg(format!("ls -l {}", path.as_mut().unwrap().to_string_lossy()));
  //   let output = cmd.output()
  //     .expect("failed to execute process");
  // String::from_utf8_lossy(&output.stdout).into()
}

fn kill_process_by_name() {
  if cfg!(target_os = "windows") {
    let mut cmd = Command::new("cmd");
    cmd.args(&["/C", "Taskkill /F /IM dbnet-x86_64-pc-windows-msvc.exe"]);

    let output = cmd.output().expect("failed to execute process");
    println!("killed PID: {}", output.status);
  } else {
    let mut cmd = Command::new("sh");
    cmd.arg("-c").arg(format!("pkill -f \"dbnet-x86_64-apple-darwin\""));
    let output = cmd.output().expect("failed to execute process");
    println!("killed PID: {}", output.status);
  };
}

#[tauri::command]
fn kill_pid(pid: String) {
  if cfg!(target_os = "windows") {
    let mut cmd = Command::new("cmd");
    cmd.args(&["/C", "Taskkill /F /PID", &pid]);

    let output = cmd.output().expect("failed to execute process");
    println!("killed PID {}: {}", pid, output.status);
  } else {
    let mut cmd = Command::new("sh");
    cmd.arg("-c").arg(format!("kill -9 {}", pid));
    let output = cmd.output().expect("failed to execute process");
    println!("killed PID {}: {}", pid, output.status);
  };
}

fn open_browser(port: String) {
  let url = format!("http://localhost:{}", port);
  if cfg!(target_os = "windows") {
    let mut cmd = Command::new("cmd");
    cmd.args(&["/C", "start", "", &url]);
    let output = cmd.output().expect("failed to open browser");
    println!("open {}: {}", url, output.status);
  } else {
    let mut cmd = Command::new("sh");
    cmd.arg("-c").arg(format!("open {}", url));
    let output = cmd.output().expect("failed to open browser");
    println!("open {}: {}", url, output.status);
  };
}
