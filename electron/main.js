const { app, BrowserWindow, ipcMain, protocol } = require('electron')
const path = require('path')
const fs   = require('fs')
const url  = require('url')

const isDev = !app.isPackaged

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#f9fafb',
    show: true,
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
    // Charge via le protocol 'app://' qu'on a enregistré
    mainWindow.loadURL('app://./index.html')
    mainWindow.webContents.openDevTools()
  }

  mainWindow.webContents.on('did-fail-load', (_, code, desc, url) => {
    console.error('[APP] did-fail-load:', code, desc, url)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[APP] ✅ Page chargée')
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

// Enregistre le protocol AVANT app.whenReady()
app.whenReady().then(() => {

  // ── Protocol 'app://' ────────────────────────────────────────
  // Sert les fichiers depuis dist/ dans l'asar
  protocol.registerFileProtocol('app', (request, callback) => {
    const reqUrl = request.url.replace('app://./', '')
    const filePath = path.join(app.getAppPath(), 'dist', reqUrl)
    console.log('[PROTOCOL] Serving:', filePath)
    callback({ path: filePath })
  })

  // ── DB ───────────────────────────────────────────────────────
  try {
    const { initDB } = require('./database/db')
    initDB()
    console.log('[DB] ✅ Initialisée')
  } catch (e) {
    console.error('[DB] ❌', e.message)
    console.error(e.stack)
  }

  // ── IPC handlers ─────────────────────────────────────────────
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