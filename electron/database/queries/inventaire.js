const { getDB } = require('../db')

function register(ipcMain) {

  // ── Lister les inventaires ────────────────────────────────
  ipcMain.handle('inventaire:getAll', () => {
    return getDB().prepare(`
      SELECT i.*,
             u.nom || ' ' || u.prenom AS user_nom,
             COUNT(il.id)             AS nb_lignes,
             SUM(ABS(il.ecart))       AS total_ecart
      FROM inventaires i
      LEFT JOIN users u           ON i.user_id   = u.id
      LEFT JOIN inventaire_lignes il ON il.inventaire_id = i.id
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `).all()
  })

  // ── Détail avec lignes ────────────────────────────────────
  ipcMain.handle('inventaire:getById', (_, id) => {
    const db  = getDB()
    const inv = db.prepare(`
      SELECT i.*, u.nom || ' ' || u.prenom AS user_nom
      FROM inventaires i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `).get(id)
    if (!inv) return null

    inv.lignes = db.prepare(`
      SELECT il.*, a.designation, a.unite, a.categorie, a.reference
      FROM inventaire_lignes il
      JOIN articles a ON il.article_id = a.id
      WHERE il.inventaire_id = ?
      ORDER BY a.designation
    `).all(id)
    return inv
  })

  // ── Créer un nouvel inventaire (snapshot du stock actuel) ─
  ipcMain.handle('inventaire:create', (_, { user_id, observations }) => {
    const db = getDB()

    // Un seul inventaire EN_COURS à la fois
    const existing = db.prepare("SELECT id FROM inventaires WHERE statut = 'EN_COURS'").get()
    if (existing) return { ok: false, error: 'Un inventaire est déjà en cours', id: existing.id }

    const result = db.transaction(() => {
      const { lastInsertRowid: invId } = db.prepare(`
        INSERT INTO inventaires (date_debut, statut, user_id, observations)
        VALUES (date('now'), 'EN_COURS', ?, ?)
      `).run(user_id, observations || null)

      // Snapshot : une ligne par article actif avec stock théorique = stock actuel
      const articles = db.prepare('SELECT id, stock_actuel FROM articles WHERE actif = 1').all()
      const ins = db.prepare(`
        INSERT INTO inventaire_lignes (inventaire_id, article_id, stock_theorique, stock_reel)
        VALUES (?, ?, ?, 0)
      `)
      for (const a of articles) ins.run(invId, a.id, a.stock_actuel)

      return { ok: true, id: invId }
    })()
    return result
  })

  // ── Sauvegarder les comptages (stock_reel) ────────────────
  ipcMain.handle('inventaire:saveLignes', (_, { inventaire_id, lignes }) => {
    const db  = getDB()
    const inv = db.prepare('SELECT statut FROM inventaires WHERE id = ?').get(inventaire_id)
    if (inv?.statut !== 'EN_COURS') return { ok: false, error: 'Inventaire non modifiable' }

    const upd = db.prepare(`
      UPDATE inventaire_lignes SET stock_reel = ?, observations = ?
      WHERE inventaire_id = ? AND article_id = ?
    `)
    db.transaction(() => {
      for (const l of lignes) {
        upd.run(l.stock_reel, l.observations || null, inventaire_id, l.article_id)
      }
    })()
    return { ok: true }
  })

  // ── Valider l'inventaire (applique les écarts au stock) ───
  ipcMain.handle('inventaire:valider', (_, { inventaire_id, user_id }) => {
    const db  = getDB()
    const inv = db.prepare('SELECT statut FROM inventaires WHERE id = ?').get(inventaire_id)
    if (inv?.statut !== 'EN_COURS') return { ok: false, error: 'Inventaire non modifiable' }

    const lignes = db.prepare(`
      SELECT il.*, a.id AS art_id
      FROM inventaire_lignes il
      JOIN articles a ON il.article_id = a.id
      WHERE il.inventaire_id = ? AND il.ecart != 0
    `).all(inventaire_id)

    db.transaction(() => {
      const insMvt = db.prepare(`
        INSERT INTO mouvements_stock
          (article_id, type, quantite, date, reference_doc, user_id, observations)
        VALUES (?, 'AJUSTEMENT', ?, date('now'), ?, ?, 'Inventaire physique')
      `)
      const updStock = db.prepare('UPDATE articles SET stock_actuel = ? WHERE id = ?')
      const refDoc   = `INV-${inventaire_id}`

      for (const l of lignes) {
        insMvt.run(l.art_id, Math.abs(l.ecart), refDoc, user_id)
        updStock.run(l.stock_reel, l.art_id)
      }

      db.prepare(`
        UPDATE inventaires SET statut = 'VALIDE', date_fin = date('now') WHERE id = ?
      `).run(inventaire_id)
    })()

    return { ok: true }
  })

  // ── Annuler un inventaire ─────────────────────────────────
  ipcMain.handle('inventaire:annuler', (_, id) => {
    getDB().prepare("UPDATE inventaires SET statut = 'ANNULE' WHERE id = ? AND statut = 'EN_COURS'").run(id)
    return { ok: true }
  })
}

module.exports = { register }