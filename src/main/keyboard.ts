import {
  getWindowRendererHandlers,
  showPanelWindowAndStartRecording,
  stopRecordingAndHidePanelWindow,
  WINDOWS,
} from "./window"
import { systemPreferences } from "electron"
import { configStore } from "./config"
import { state } from "./state"
import { spawn } from "child_process"
import path from "path"

const rdevPath = path.join(
  __dirname,
  `../../resources/bin/whispo-rdev${process.env.IS_MAC ? "" : ".exe"}`,
)

type RdevEvent = {
  event_type: "KeyPress" | "KeyRelease"
  data: {
    key: "ControlLeft" | "BackSlash" | string
  }
}

const parseEvent = (event: any) => {
  try {
    const e = JSON.parse(String(event))
    e.data = JSON.parse(e.data)
    return e as RdevEvent
  } catch {
    return null
  }
}

export function listenToKeyboardEvents() {
  let isHoldingCtrlKey = false
  let startRecordingTimer: NodeJS.Timeout | undefined
  let isPressedCtrlKey = false

  // keys that are currently pressed down without releasing
  // excluding ctrl
  const keysPressed = new Set<string>()

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

  const handleEvent = (e: RdevEvent) => {
    if (import.meta.env.DEV) {
      console.log(e)
    }

    if (e.event_type === "KeyPress") {
      if (e.data.key === "ControlLeft") {
        isPressedCtrlKey = true
      }

      if (e.data.key === "Escape" && state.isRecording) {
        const win = WINDOWS.get("panel")
        if (win) {
          stopRecordingAndHidePanelWindow()
        }

        return
      }

      if (configStore.get().shortcut === "ctrl-slash") {
        if (e.data.key === "Slash" && isPressedCtrlKey) {
          getWindowRendererHandlers("panel")?.startOrFinishRecording.send()
        }
      } else {
        if (e.data.key === "ControlLeft") {
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
          keysPressed.add(e.data.key)
          cancelRecordingTimer()

          // when holding ctrl key, pressing any other key will stop recording
          if (isHoldingCtrlKey) {
            stopRecordingAndHidePanelWindow()
          }

          isHoldingCtrlKey = false
        }
      }
    } else if (e.event_type === "KeyRelease") {
      if (e.data.key === "ControlLeft") {
        isPressedCtrlKey = false
      }

      if (configStore.get().shortcut === "ctrl-slash") return

      cancelRecordingTimer()

      keysPressed.delete(e.data.key)

      if (e.data.key === "ControlLeft") {
        console.log("release ctrl")
        if (isHoldingCtrlKey) {
          getWindowRendererHandlers("panel")?.finishRecording.send()
        } else {
          stopRecordingAndHidePanelWindow()
        }

        isHoldingCtrlKey = false
      }
    }
  }

  const child = spawn(rdevPath, {})

  child.stdout.on("data", (data) => {
    const event = parseEvent(data)
    if (!event) return

    handleEvent(event)
  })
}
