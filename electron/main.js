const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

const isDev = !app.isPackaged

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#f9fafb',
    show: true,   // affiche immédiatement — pas de ready-to-show
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html')
    console.log('[APP] Loading:', indexPath)
    mainWindow.loadFile(indexPath)
    // Ouvre DevTools en prod pour voir les erreurs JS
    mainWindow.webContents.openDevTools()
  }

  mainWindow.webContents.on('did-fail-load', (_, code, desc, url) => {
    console.error('[APP] did-fail-load:', code, desc, url)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[APP] Page chargée OK')
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
    console.error(`[IPC] ❌ ${path.basename(modulePath)}: ${e.message}`)
  }
}

app.whenReady().then(() => {
  // initDB est SYNCHRONE — pas de await
  try {
    const { initDB } = require('./database/db')
    initDB()
    console.log('[DB] ✅ Initialisée')
  } catch (e) {
    console.error('[DB] ❌', e.message)
    console.error(e.stack)
  }

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
})

app.on('window-all-closed', () => app.quit())

process.on('uncaughtException', e => {
  console.error('[CRASH]', e.message)
  console.error(e.stack)
})