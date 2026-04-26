const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs   = require('fs')

const isDev = !app.isPackaged

let mainWindow
let dbInitialized = false

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#f9fafb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // app.getAppPath() retourne le bon chemin dans l'asar
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html')
    mainWindow.loadFile(indexPath)
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.on('did-fail-load', (_, code, desc) => {
    console.error('did-fail-load:', code, desc)
  })
}

function safeRegister(modulePath) {
  try {
    const mod = require(modulePath)
    if (mod && typeof mod.register === 'function') {
      mod.register(ipcMain)
      console.log(`[IPC] ✅ ${path.basename(modulePath)}`)
    }
  } catch (e) {
    console.warn(`[IPC] ❌ ${path.basename(modulePath)}: ${e.message}`)
  }
}

app.whenReady().then(async () => {
  // initDB est maintenant async — on ATTEND qu'elle finisse
  try {
    const { initDB } = require('./database/db')
    await initDB()
    dbInitialized = true
    console.log('[DB] ✅ Initialisée')
  } catch (e) {
    console.error('[DB] ❌', e.message)
    console.error(e.stack)
  }

  // Les handlers IPC sont enregistrés APRÈS que la DB soit prête
  safeRegister('./database/queries/users')
  safeRegister('./database/queries/bda')
  safeRegister('./database/queries/bc')
  safeRegister('./database/queries/br')
  safeRegister('./database/queries/stock')
  safeRegister('./database/queries/decharge')
  safeRegister('./database/queries/fournisseurs')
  safeRegister('./database/queries/inventaire')
  safeRegister('./database/queries/articles')
  safeRegister('./database/queries/rapports')

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

process.on('uncaughtException', e => console.error('uncaughtException:', e))