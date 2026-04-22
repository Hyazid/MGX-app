const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const isDev = !app.isPackaged

let mainWindow
let dbInitialized = false

function getDistPath() {
  if (isDev) return null  // pas utilisé en dev
  // En production : process.resourcesPath pointe vers resources/
  // les fichiers "files" du build sont dans app.asar
  // __dirname = electron/ dans l'asar → on remonte d'un niveau
  return path.join(__dirname, '..', 'dist', 'index.html')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
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
    const indexPath = getDistPath()
    console.log('[APP] Loading file:', indexPath)
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('[APP] loadFile error:', err)
      // Fallback : essaie avec app.getAppPath()
      const fallback = path.join(app.getAppPath(), 'dist', 'index.html')
      console.log('[APP] Trying fallback:', fallback)
      mainWindow.loadFile(fallback)
    })
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())

  // En prod, ouvre les devtools si fenêtre blanche pour diagnostiquer
  if (!isDev) {
    mainWindow.webContents.on('did-fail-load', (e, code, desc, url) => {
      console.error('[APP] did-fail-load:', code, desc, url)
      mainWindow.webContents.openDevTools()
    })
  }
}

function safeRegister(modulePath) {
  try {
    const mod = require(modulePath)
    if (mod && typeof mod.register === 'function') {
      mod.register(ipcMain)
      console.log(`[IPC] ✅ ${path.basename(modulePath)} chargé`)
    }
  } catch (e) {
    console.warn(`[IPC] ⚠️  ${path.basename(modulePath)} ignoré : ${e.message}`)
  }
}

app.whenReady().then(() => {
  try {
    const { initDB } = require('./database/db')
    initDB()
    dbInitialized = true
    console.log('[APP] ✅ Base de données initialisée')
  } catch (e) {
    console.error('[APP] ❌ Erreur DB critique :', e.message)
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})