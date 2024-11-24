import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import HID from 'node-hid'
import robotjs from 'robotjs'

interface PedalValues {
  accelerator: number
  brake: number
  clutch: number
}

let mainWindow: BrowserWindow | null = null
let pedalDevice: HID.HID | null = null

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
  // 5 = accelerator, 3 = brake, 7 = clutch
  const pedalValues: PedalValues = {
    accelerator: data[5] + data[6] * 255, // First pair
    brake: data[3] + data[4] * 255, // Second pair
    clutch: data[7] + data[8] * 255 // Third pair
  }

  // console.log('Raw Data:', {
  //   accelerator: [data[5], data[6]],
  //   brake: [data[3], data[4]],
  //   clutch: [data[7], data[8]],
  const normalized: PedalValues = {
    accelerator: Math.round((pedalValues.accelerator / 1020) * 100),
    brake: Math.round((pedalValues.brake / 1020) * 100),
    clutch: Math.round((pedalValues.clutch / 1020) * 100)
  }
  mainWindow!.webContents.send('pedal-update', normalized)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

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
