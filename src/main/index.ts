import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import HID from 'node-hid'
import robotjs from 'robotjs'

interface PedalConfig {
  action: 'keypress' | 'mouseScroll' | 'windowSwitch'
  key?: string
  direction?: 'up' | 'down'
  threshold: number
}

interface PedalValues {
  accelerator: number
  brake: number
  clutch: number
}

interface Config {
  accelerator: PedalConfig
  brake: PedalConfig
  clutch: PedalConfig
}

const DEFAULT_CONFIG: Config = {
  accelerator: {
    action: 'keypress',
    key: 'w',
    threshold: 0.2
  },
  brake: {
    action: 'keypress',
    key: 's',
    threshold: 0.2
  },
  clutch: {
    action: 'mouseScroll',
    direction: 'up',
    threshold: 0.3
  }
}

let mainWindow: BrowserWindow | null = null
let pedalDevice: HID.HID | null = null

const actionHandlers = {
  keypress: (key: string, isPressed: boolean): void => {
    robotjs.keyToggle(key, isPressed ? 'down' : 'up')
  },
  mouseScroll: (direction: 'up' | 'down', value: number): void => {
    const scrollAmount = direction === 'up' ? 5 : -5
    robotjs.scrollMouse(0, Math.round(scrollAmount * value))
  },
  windowSwitch: (isPressed: boolean): void => {
    if (isPressed) {
      robotjs.keyTap('tab', 'alt')
    }
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function initializePedalDevice(): void {
  try {
    const devices = HID.devices()
    const pedalInfo = devices.find((d) => d.vendorId === 1103 && d.productId === 46702)

    if (pedalInfo && pedalInfo.path) {
      pedalDevice = new HID.HID(pedalInfo.path)
      pedalDevice.on('data', handlePedalData)
      console.log('Successfully connected to Thrustmaster T300')
    } else {
      console.log('Thrustmaster T300 not found')
    }
  } catch (error) {
    console.error('Error initializing pedal device:', error)
  }
}
function handlePedalData(data: Buffer): void {
  console.log(
    data[0],
    '\t',
    data[1],
    '\t',
    data[2],
    '\t',
    data[3],
    '\t',
    data[4],
    '\t',
    data[5],
    '\t',
    data[6],
    '\t',
    data[7],
    '\t',
    data[8]
  )
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  initializePedalDevice()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on('update-pedal-config', (event, config) => {
  // Handle pedal configuration updates
  console.log('Pedal config updated:', config)
})
