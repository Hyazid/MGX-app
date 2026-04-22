const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const isDev = !app.isPackaged

let mainWindow
let dbInitialized = false

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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())
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
  // ── 1. Init DB — OBLIGATOIRE, pas de try/catch global ────────
  try {
    const { initDB } = require('./database/db')
    initDB()
    dbInitialized = true
    console.log('[APP] ✅ Base de données initialisée')
  } catch (e) {
    // Affiche l'erreur complète pour diagnostiquer
    console.error('[APP] ❌ Erreur DB critique :', e.message)
    console.error(e.stack)
    // L'app continue mais les IPC retourneront une erreur claire
  }

  // ── 2. IPC handlers ──────────────────────────────────────────
  // Handler global pour informer le renderer si DB non dispo
  if (!dbInitialized) {
    ipcMain.handle('db:status', () => ({ ok: false, error: 'Base de données non initialisée' }))
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

  // ── 3. Fenêtre ───────────────────────────────────────────────
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})