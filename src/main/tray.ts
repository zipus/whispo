import { Menu, Tray } from "electron"
import path from "path"
import {
  getWindowRendererHandlers,
  showMainWindow,
  showPanelWindowAndStartRecording,
  stopRecordingAndHidePanelWindow,
} from "./window"
import { state } from "./state"

const defaultIcon = path.join(__dirname, "../../resources/trayIcon.png")
const stopIcon = path.join(__dirname, "../../resources/stopTrayIcon.png")

const buildMenu = (tray: Tray) =>
  Menu.buildFromTemplate([
    {
      label: state.isRecording ? "Cancel Recording" : "Start Recording",
      click() {
        if (state.isRecording) {
          state.isRecording = false
          tray.setImage(defaultIcon)
          stopRecordingAndHidePanelWindow()
          return
        }
        state.isRecording = true
        tray.setImage(stopIcon)
        showPanelWindowAndStartRecording()
      },
    },
    {
      label: "View History",
      click() {
        showMainWindow("/")
      },
    },
    {
      type: "separator",
    },
    {
      label: "Settings",
      accelerator: "CmdOrCtrl+,",
      click() {
        showMainWindow("/settings")
      },
    },
    {
      type: "separator",
    },
    {
      role: "quit",
    },
  ])

export const initTray = () => {
  const tray = new Tray(defaultIcon)

  tray.on("click", () => {
    if (state.isRecording) {
      state.isRecording = false
      tray.setImage(defaultIcon)
      getWindowRendererHandlers("panel")?.finishRecording.send()
      return
    }
    tray.popUpContextMenu(buildMenu(tray))
  })

  tray.on("right-click", () => {
    tray.popUpContextMenu(buildMenu(tray))
  })
}
