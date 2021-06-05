// With the Tauri API npm package:
import * as Tauri from '@tauri-apps/api/tauri'

// With the Tauri global script, enabled when `tauri.conf.json > build > withGlobalTauri` is set to true:
// const invoke = window.__TAURI__.invoke


export const TauriLaunchBackend = async () => {
  // Invoke the command
  try {
    await Tauri.invoke('launch_backend')
  } catch (error) {
    console.log("could not invoke tauri backend")
    console.error(new Error(error))
  }
}