import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import ps from 'ps-node'
import si from 'systeminformation'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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

ipcMain.handle('get-processes', async () => {
  try {
    const [processData, memInfo] = await Promise.all([si.processes(), si.mem()])

    console.log('Пример данных процесса:', JSON.stringify(processData.list[0], null, 2))
    console.log('Общая память (bytes):', memInfo.total)
    console.log('Общая память (MB):', memInfo.total / 1024 / 1024)
    console.log('Количество1 процессов:', processData.list.length)

    return processData.list.map((proc) => {
      return {
        pid: proc.pid,
        name: proc.name,
        cpu: typeof proc.cpu === 'number' ? Number(proc.cpu.toFixed(1)) : 0,
        memory: proc.mem,
        priority: proc.priority || 0,
        path: proc.path || ''
      }
    })
  } catch (error) {
    console.error('Error getting processes:', error)
    return []
  }
})

ipcMain.handle('change-process-priority', async (_, { pid, priority }) => {
  return new Promise((resolve) => {
    ps.kill(pid, { priority }, (err) => {
      resolve(!err)
    })
  })
})

ipcMain.handle('terminate-process', async (_, pid) => {
  return new Promise((resolve) => {
    ps.kill(pid, (err) => {
      resolve(!err)
    })
  })
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

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
