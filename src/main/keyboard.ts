import { uIOhook, UiohookKey } from "uiohook-napi"
import { getWindowRendererHandlers, showPanelWindow, showPanelWindowAndStartRecording, stopRecordingAndHidePanelWindow, WINDOWS } from "./window"
import { systemPreferences } from "electron"
import { configStore } from "./config"

export function listenToKeyboardEvents() {
  try {
    let isHoldingCtrlKey = false
    let startRecordingTimer: NodeJS.Timeout | undefined

    // keys that are currently pressed down without releasing
    // excluding ctrl
    const keysPressed = new Set<number>()

    if (process.env.IS_MAC) {
      if (!systemPreferences.isTrustedAccessibilityClient(false)) {
        return
      }
    }

    const cancelRecordingTimer = () => {
      if (startRecordingTimer) {
        clearTimeout(startRecordingTimer)
        startRecordingTimer = undefined
      }
    }

    uIOhook.on("keydown", (e) => {
      if (configStore.get().shortcut === 'ctrl-backslash') {
        if (e.keycode === UiohookKey.Backslash && e.ctrlKey) {

          getWindowRendererHandlers('panel')?.startOrFinishRecording.send()
        } else if (e.keycode === UiohookKey.Escape) {
          const win = WINDOWS.get('panel')
          if (win) {
            stopRecordingAndHidePanelWindow()
          }
        }
      } else {
        if (e.keycode === UiohookKey.Ctrl) {

          if (keysPressed.size > 0) {
            console.log("ignore ctrl because other keys are pressed")
            return
          }

          if (startRecordingTimer) {
            // console.log('already started recording timer')
            return
          }

          startRecordingTimer = setTimeout(() => {
            isHoldingCtrlKey = true

            console.log("start recording")

            showPanelWindowAndStartRecording()

          }, 800)
        } else {
          keysPressed.add(e.keycode)
          cancelRecordingTimer()

          // when holding ctrl key, pressing any other key will stop recording
          if (isHoldingCtrlKey) {
            stopRecordingAndHidePanelWindow()
          }

          isHoldingCtrlKey = false
        }
      }
    })

    uIOhook.on("keyup", (e) => {
      if (configStore.get().shortcut === 'ctrl-backslash') return

      cancelRecordingTimer()

      keysPressed.delete(e.keycode)

      if (e.keycode === UiohookKey.Ctrl) {
        console.log("release ctrl")
        if (isHoldingCtrlKey) {
          getWindowRendererHandlers('panel')?.finishRecording.send()
        } else {
          stopRecordingAndHidePanelWindow()
        }

        isHoldingCtrlKey = false
      }

    })

    uIOhook.start()
  } catch { }
}
