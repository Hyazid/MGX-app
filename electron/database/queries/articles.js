
// ============================================================
// electron/database/queries/articles.js
// ============================================================
const { getDB } = require('../db')

function register(ipcMain) {
  ipcMain.handle('articles:getAll', () => {
    try {
      return getDB().prepare(`
        SELECT * FROM articles WHERE actif = 1 ORDER BY designation
      `).all()
    } catch { return [] }
  })

  ipcMain.handle('articles:create', (_, { designation, reference, unite, categorie, stock_minimum, localisation }) => {
    try {
      const info = getDB().prepare(`
        INSERT INTO articles (designation, reference, unite, categorie, stock_minimum, localisation)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(designation, reference || null, unite || 'pcs', categorie || null, stock_minimum || 0, localisation || null)
      return { ok: true, id: info.lastInsertRowid }
    } catch (e) { return { ok: false, error: e.message } }
  })

  ipcMain.handle('articles:update', (_, { id, designation, reference, unite, categorie, stock_minimum, localisation }) => {
    try {
      getDB().prepare(`
        UPDATE articles SET designation=?, reference=?, unite=?, categorie=?, stock_minimum=?, localisation=?
        WHERE id=?
      `).run(designation, reference || null, unite, categorie || null, stock_minimum || 0, localisation || null, id)
      return { ok: true }
    } catch (e) { return { ok: false, error: e.message } }
  })

  ipcMain.handle('articles:delete', (_, id) => {
    try {
      getDB().prepare('UPDATE articles SET actif = 0 WHERE id = ?').run(id)
      return { ok: true }
    } catch (e) { return { ok: false, error: e.message } }
  })
}

module.exports = { register }

