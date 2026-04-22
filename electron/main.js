const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs   = require('fs')
const os   = require('os')

const isDev = !app.isPackaged

// ── Log immédiat sur le Bureau Windows ───────────────────────
// Écrit sur le Bureau ET dans temp, avant même app.whenReady()
const LOG_PATHS = [
  path.join(os.homedir(), 'Desktop', 'moyens-generaux-debug.log'),
  path.join(os.tmpdir(), 'moyens-generaux-debug.log'),
]

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`
  process.stdout.write(line)
  for (const p of LOG_PATHS) {
    try { fs.appendFileSync(p, line) } catch (_) {}
  }
}

// Premier log IMMÉDIAT
log('=== PROCESS STARTED ===')
log(`platform: ${process.platform} arch: ${process.arch}`)
log(`node: ${process.versions.node}`)
log(`electron: ${process.versions.electron}`)
log(`__dirname: ${__dirname}`)
log(`isPackaged: ${app.isPackaged}`)

let mainWindow
let dbInitialized = false

// ── Test better-sqlite3 immédiatement ────────────────────────
try {
  const Database = require('better-sqlite3')
  log('✅ better-sqlite3 loaded OK')
} catch (e) {
  log(`❌ better-sqlite3 FAILED: ${e.message}`)
}

function createWindow() {
  log('createWindow() called')

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#ffffff',
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
    const appPath = app.getAppPath()
    log(`app.getAppPath(): ${appPath}`)

    // Tous les candidats possibles
    const candidates = [
      path.join(appPath, 'dist', 'index.html'),
      path.join(__dirname, '..', 'dist', 'index.html'),
      path.join(process.resourcesPath, 'app', 'dist', 'index.html'),
      path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html'),
    ]

    let found = null
    for (const c of candidates) {
      let exists = false
      try { exists = fs.existsSync(c) } catch (_) {}
      log(`${exists ? '✅' : '❌'} ${c}`)
      if (exists && !found) found = c
    }

    if (found) {
      log(`→ Loading: ${found}`)
      mainWindow.loadFile(found)
    } else {
      log('❌ index.html NOT FOUND — showing error page')
      mainWindow.loadURL(
        'data:text/html;charset=utf-8,' +
        encodeURIComponent(
          `<html><body style="font-family:monospace;padding:20px;background:#1e1e1e;color:#fff">
          <h2 style="color:#f87171">❌ index.html introuvable</h2>
          <p>Chemins testés :</p>
          <ul>${candidates.map(c => `<li>${c}</li>`).join('')}</ul>
          <p>Voir le log sur le Bureau : <b>moyens-generaux-debug.log</b></p>
          </body></html>`
        )
      )
    }
  }

  mainWindow.webContents.on('did-finish-load', () => log('✅ Page loaded'))
  mainWindow.webContents.on('did-fail-load', (_, code, desc, url) => {
    log(`❌ did-fail-load: ${code} ${desc} ${url}`)
    mainWindow.webContents.openDevTools()
  })

  mainWindow.once('ready-to-show', () => {
    log('ready-to-show → showing window')
    mainWindow.show()
  })
}

function safeRegister(modulePath) {
  try {
    const mod = require(modulePath)
    if (mod && typeof mod.register === 'function') {
      mod.register(ipcMain)
      log(`[IPC] ✅ ${path.basename(modulePath)}`)
    }
  } catch (e) {
    log(`[IPC] ❌ ${path.basename(modulePath)}: ${e.message}`)
  }
}

app.whenReady().then(() => {
  log('=== app.whenReady() ===')
  log(`userData: ${app.getPath('userData')}`)

  // Aussi écrire dans userData maintenant qu'on peut
  LOG_PATHS.push(path.join(app.getPath('userData'), 'debug.log'))

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
}).catch(e => {
  log(`❌ app.whenReady() REJECTED: ${e.message}`)
  log(e.stack)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Capture toutes les erreurs non gérées
process.on('uncaughtException', (e) => {
  log(`❌ uncaughtException: ${e.message}`)
  log(e.stack)
})

process.on('unhandledRejection', (e) => {
  log(`❌ unhandledRejection: ${e}`)
})