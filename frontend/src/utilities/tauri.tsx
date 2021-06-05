// With the Tauri API npm package:
import * as Tauri from '@tauri-apps/api/tauri'
import { toastInfo } from './methods'

// With the Tauri global script, enabled when `tauri.conf.json > build > withGlobalTauri` is set to true:
// const invoke = window.__TAURI__.invoke


export const TauriLaunchBackend = async () => {
  // Invoke the command
  try {
    let pid : string = await Tauri.invoke('launch_backend')
    toastInfo(`PID ${pid}`)
    setTimeout(async () => {
      await Tauri.invoke('kill_pid', { pid: pid })
      toastInfo(`Killed PID ${pid}`)
    }, 2000);
  } catch (error) {
    console.log("could not invoke tauri backend")
    console.error(new Error(error))
  }
}

export const TauriGetCwd = async () => {
  // Invoke the command
  try {
    let work_dir : string = await Tauri.invoke('get_cwd')
    // toastInfo(`WD: ${work_dir}`)
    toastInfo(work_dir)
    alert(work_dir)
  } catch (error) {
    console.log("could not run get_cwd")
    console.error(new Error(error))
  }
}