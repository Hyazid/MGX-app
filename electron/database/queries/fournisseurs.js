

// ============================================================
// electron/database/queries/fournisseurs.js
// ============================================================
const { getDB } = require('../db')

function register(ipcMain) {
  ipcMain.handle('fournisseurs:getAll', () => {
    try {
      return getDB().prepare(`
        SELECT * FROM fournisseurs WHERE actif = 1 ORDER BY nom
      `).all()
    } catch { return [] }
  })

  ipcMain.handle('fournisseurs:create', (_, { nom, adresse, telephone, email, nif, rc, rib }) => {
    try {
      const info = getDB().prepare(`
        INSERT INTO fournisseurs (nom, adresse, telephone, email, nif, rc, rib)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(nom, adresse||null, telephone||null, email||null, nif||null, rc||null, rib||null)
      return { ok: true, id: info.lastInsertRowid }
    } catch (e) { return { ok: false, error: e.message } }
  })

  ipcMain.handle('fournisseurs:update', (_, { id, nom, adresse, telephone, email, nif, rc, rib }) => {
    try {
      getDB().prepare(`
        UPDATE fournisseurs SET nom=?, adresse=?, telephone=?, email=?, nif=?, rc=?, rib=? WHERE id=?
      `).run(nom, adresse||null, telephone||null, email||null, nif||null, rc||null, rib||null, id)
      return { ok: true }
    } catch (e) { return { ok: false, error: e.message } }
  })

  ipcMain.handle('fournisseurs:delete', (_, id) => {
    try {
      getDB().prepare('UPDATE fournisseurs SET actif = 0 WHERE id = ?').run(id)
      return { ok: true }
    } catch (e) { return { ok: false, error: e.message } }
  })
}

module.exports = { register }

