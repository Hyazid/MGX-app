// electron/database/queries/users.js
const bcrypt = require('bcryptjs')
const { getDB } = require('../db')

function register(ipcMain) {

  // ── Login ─────────────────────────────────────────────────
  ipcMain.handle('users:login', (_, { username, password }) => {
    const db = getDB()
    const user = db.prepare(`
      SELECT id, nom, prenom, username, password_hash, role, actif
      FROM users WHERE username = ?
    `).get(username)

    if (!user)              return { ok: false, error: 'Utilisateur introuvable' }
    if (!user.actif)        return { ok: false, error: 'Compte désactivé' }
    if (!bcrypt.compareSync(password, user.password_hash))
                            return { ok: false, error: 'Mot de passe incorrect' }

    // Ne jamais renvoyer le hash au renderer
    const { password_hash, ...safeUser } = user
    return { ok: true, user: safeUser }
  })

  // ── CRUD Users (admin seulement) ──────────────────────────
  ipcMain.handle('users:getAll', () => {
    return getDB().prepare(`
      SELECT id, nom, prenom, username, role, actif, created_at
      FROM users ORDER BY nom
    `).all()
  })

  ipcMain.handle('users:create', (_, { nom, prenom, username, password, role }) => {
    const db = getDB()
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (exists) return { ok: false, error: 'Username déjà utilisé' }

    const hash = bcrypt.hashSync(password, 10)
    const info = db.prepare(`
      INSERT INTO users (nom, prenom, username, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(nom, prenom, username, hash, role)

    return { ok: true, id: info.lastInsertRowid }
  })

ipcMain.handle('users:update', (_, { id, nom, prenom, username, role }) => {
  const db = getDB()
  // Vérifie que le username n'est pas pris par un autre
  const conflict = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id)
  if (conflict) return { ok: false, error: 'Ce username est déjà utilisé' }

  db.prepare(`
    UPDATE users SET nom = ?, prenom = ?, username = ?, role = ? WHERE id = ?
  `).run(nom, prenom, username, role, id)
  return { ok: true }
})

  ipcMain.handle('users:changePassword', (_, { id, newPassword }) => {
    const hash = bcrypt.hashSync(newPassword, 10)
    getDB().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id)
    return { ok: true }
  })

  ipcMain.handle('users:toggleActif', (_, { id }) => {
    getDB().prepare('UPDATE users SET actif = NOT actif WHERE id = ?').run(id)
    return { ok: true }
  })
}

module.exports = { register }