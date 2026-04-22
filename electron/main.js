const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs   = require('fs')

const isDev = !app.isPackaged

// ── Logger dans un fichier (visible même sans terminal) ──────
function setupLogger() {
  const logDir  = app.getPath('userData')
  const logFile = path.join(logDir, 'debug.log')
  const stream  = fs.createWriteStream(logFile, { flags: 'w' })

  const log = (...args) => {
    const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`
    stream.write(line)
    console.log(...args)
  }
  return log
}

let log
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
    // Log tous les chemins possibles pour diagnostiquer
    const paths = {
      __dirname,
      appPath:       app.getAppPath(),
      resourcesPath: process.resourcesPath,
      userData:      app.getPath('userData'),
    }
    log('=== PATHS ===')
    Object.entries(paths).forEach(([k, v]) => log(`  ${k}: ${v}`))

    // Essaie les chemins dans l'ordre jusqu'à trouver index.html
    const candidates = [
      path.join(__dirname, '..', 'dist', 'index.html'),
      path.join(app.getAppPath(), 'dist', 'index.html'),
      path.join(process.resourcesPath, 'app', 'dist', 'index.html'),
      path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html'),
    ]

    log('=== SEARCHING index.html ===')
    let found = null
    for (const c of candidates) {
      const exists = fs.existsSync(c)
      log(`  ${exists ? '✅' : '❌'} ${c}`)
      if (exists && !found) found = c
    }

    if (found) {
      log(`Loading: ${found}`)
      mainWindow.loadFile(found)
    } else {
      log('❌ index.html NOT FOUND in any candidate path!')
      // Ouvre devtools pour voir l'erreur
      mainWindow.webContents.openDevTools()
      mainWindow.loadURL(`data:text/html,<h1>ERROR: index.html not found</h1><pre>${candidates.join('\n')}</pre>`)
    }
  }

  // Events pour diagnostiquer
  mainWindow.webContents.on('did-finish-load', () => log('✅ Page loaded successfully'))
  mainWindow.webContents.on('did-fail-load', (e, code, desc, url) => {
    log(`❌ did-fail-load: ${code} ${desc} ${url}`)
    if (!isDev) mainWindow.webContents.openDevTools()
  })
  mainWindow.webContents.on('render-process-gone', (e, details) => {
    log(`❌ render-process-gone: ${JSON.stringify(details)}`)
  })
  mainWindow.webContents.on('crashed', () => log('❌ CRASHED'))

  mainWindow.once('ready-to-show', () => {
    log('Window ready-to-show')
    mainWindow.show()
  })
}

function safeRegister(modulePath) {
  try {
    const mod = require(modulePath)
    if (mod && typeof mod.register === 'function') {
      mod.register(ipcMain)
      log(`[IPC] ✅ ${path.basename(modulePath)} chargé`)
    }
  } catch (e) {
    log(`[IPC] ❌ ${path.basename(modulePath)} : ${e.message}`)
  }
}

app.whenReady().then(() => {
  log = setupLogger()
  log('=== APP STARTING ===')
  log(`isDev: ${isDev}`)
  log(`platform: ${process.platform}`)
  log(`electron: ${process.versions.electron}`)
  log(`node: ${process.versions.node}`)

  // Init DB
  try {
    const { initDB } = require('./database/db')
    initDB()
    dbInitialized = true
    log('[DB] ✅ Initialisée')
  } catch (e) {
    log(`[DB] ❌ ${e.message}`)
    log(e.stack)
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