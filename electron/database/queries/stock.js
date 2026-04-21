const { getDB } = require('../db')

function register(ipcMain) {

  // ── État stock complet ────────────────────────────────────
  ipcMain.handle('stock:getAll', () => {
    return getDB().prepare(`
      SELECT a.*,
        CASE
          WHEN a.stock_actuel <= 0              THEN 'RUPTURE'
          WHEN a.stock_actuel <= a.stock_minimum THEN 'ALERTE'
          ELSE 'OK'
        END AS etat_stock
      FROM articles a
      WHERE a.actif = 1
      ORDER BY a.designation
    `).all()
  })

  // ── Articles en alerte ou rupture ────────────────────────
  ipcMain.handle('stock:getAlertes', () => {
    return getDB().prepare(`
      SELECT * FROM articles
      WHERE actif = 1 AND stock_actuel <= stock_minimum
      ORDER BY (stock_actuel - stock_minimum) ASC
    `).all()
  })

  // ── Historique mouvements d'un article ───────────────────
  ipcMain.handle('stock:getMouvements', (_, { article_id, limit = 50 }) => {
    return getDB().prepare(`
      SELECT ms.*,
             u.nom || ' ' || u.prenom AS user_nom
      FROM mouvements_stock ms
      LEFT JOIN users u ON ms.user_id = u.id
      WHERE ms.article_id = ?
      ORDER BY ms.created_at DESC
      LIMIT ?
    `).all(article_id, limit)
  })

  // ── Tous les mouvements (avec filtre optionnel) ───────────
  ipcMain.handle('stock:getAllMouvements', (_, filters = {}) => {
    const db = getDB()
    let sql = `
      SELECT ms.*, a.designation AS article_nom, a.unite,
             u.nom || ' ' || u.prenom AS user_nom
      FROM mouvements_stock ms
      JOIN articles a ON ms.article_id = a.id
      LEFT JOIN users u ON ms.user_id = u.id
    `
    const params = [], where = []
    if (filters.type)       { where.push('ms.type = ?');        params.push(filters.type) }
    if (filters.article_id) { where.push('ms.article_id = ?');  params.push(filters.article_id) }
    if (filters.date_debut) { where.push('ms.date >= ?');       params.push(filters.date_debut) }
    if (filters.date_fin)   { where.push('ms.date <= ?');       params.push(filters.date_fin) }
    if (where.length) sql += ' WHERE ' + where.join(' AND ')
    sql += ' ORDER BY ms.created_at DESC LIMIT 200'
    return db.prepare(sql).all(...params)
  })

  // ── Sortie manuelle de stock ──────────────────────────────
  ipcMain.handle('stock:sortie', (_, { article_id, quantite, service, user_id, observations }) => {
    const db = getDB()
    const art = db.prepare('SELECT stock_actuel, designation FROM articles WHERE id = ?').get(article_id)
    if (!art)                          return { ok: false, error: 'Article introuvable' }
    if (art.stock_actuel < quantite)   return { ok: false, error: `Stock insuffisant (disponible: ${art.stock_actuel})` }

    db.transaction(() => {
      db.prepare(`
        INSERT INTO mouvements_stock (article_id, type, quantite, date, service, user_id, observations)
        VALUES (?, 'SORTIE', ?, date('now'), ?, ?, ?)
      `).run(article_id, quantite, service || null, user_id, observations || null)

      db.prepare('UPDATE articles SET stock_actuel = stock_actuel - ? WHERE id = ?')
        .run(quantite, article_id)
    })()

    return { ok: true }
  })

  // ── Ajustement stock (inventaire) ────────────────────────
  ipcMain.handle('stock:ajustement', (_, { article_id, nouvelle_quantite, user_id, observations }) => {
    const db  = getDB()
    const art = db.prepare('SELECT stock_actuel FROM articles WHERE id = ?').get(article_id)
    if (!art) return { ok: false, error: 'Article introuvable' }

    const ecart = nouvelle_quantite - art.stock_actuel

    db.transaction(() => {
      db.prepare(`
        INSERT INTO mouvements_stock (article_id, type, quantite, date, user_id, observations)
        VALUES (?, 'AJUSTEMENT', ?, date('now'), ?, ?)
      `).run(article_id, Math.abs(ecart), user_id, observations || 'Ajustement inventaire')

      db.prepare('UPDATE articles SET stock_actuel = ? WHERE id = ?')
        .run(nouvelle_quantite, article_id)
    })()

    return { ok: true }
  })
}

module.exports = { register }