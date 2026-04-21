// electron/main.js
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

// Charge un handler seulement s'il existe, sinon l'ignore silencieusement
function safeRegister(modulePath) {
  try {
    const mod = require(modulePath)
    if (mod && typeof mod.register === 'function') {
      mod.register(ipcMain)
      console.log(`[IPC] ✅ ${path.basename(modulePath)} chargé`)
    }
  } catch (e) {
    console.warn(`[IPC] ⚠️  ${path.basename(modulePath)} ignoré (fichier manquant ou erreur)`)
    console.warn(`       → ${e.message}`)
  }
}

app.whenReady().then(() => {
  // 1. Init DB (avec try/catch pour ne pas bloquer si db.js incomplet)
  try {
    const { initDB } = require('./database/db')
    initDB()
    console.log('[APP] ✅ Base de données initialisée')
  } catch (e) {
    console.warn('[APP] ⚠️  DB ignorée :', e.message)
  }

  // 2. Enregistrer les handlers IPC disponibles
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

  // 3. Créer la fenêtre — toujours, quoi qu'il arrive
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})