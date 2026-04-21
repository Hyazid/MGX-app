const { getDB } = require('../db')

function genNumero(db, prefix, table) {
  const year = new Date().getFullYear()
  const last = db.prepare(`
    SELECT numero FROM ${table}
    WHERE numero LIKE '${prefix}-${year}-%'
    ORDER BY id DESC LIMIT 1
  `).get()
  const seq = last
    ? String(parseInt(last.numero.split('-')[2]) + 1).padStart(4, '0')
    : '0001'
  return `${prefix}-${year}-${seq}`
}

function register(ipcMain) {

  // ── Lister ────────────────────────────────────────────────
  ipcMain.handle('bc:getAll', (_, filters = {}) => {
    const db = getDB()
    let sql = `
      SELECT bc.*,
             f.nom        AS fournisseur_nom,
             u.nom || ' ' || u.prenom AS chef_nom
      FROM bc
      LEFT JOIN fournisseurs f ON bc.fournisseur_id = f.id
      LEFT JOIN users        u ON bc.chef_id        = u.id
    `
    const params = [], where = []
    if (filters.statut) { where.push('bc.statut = ?'); params.push(filters.statut) }
    if (where.length) sql += ' WHERE ' + where.join(' AND ')
    sql += ' ORDER BY bc.created_at DESC'
    return db.prepare(sql).all(...params)
  })

  // ── Détail avec lignes ────────────────────────────────────
  ipcMain.handle('bc:getById', (_, id) => {
    const db = getDB()
    const bc = db.prepare(`
      SELECT bc.*,
             f.nom AS fournisseur_nom, f.adresse AS fournisseur_adresse,
             f.telephone AS fournisseur_tel,
             u.nom || ' ' || u.prenom AS chef_nom,
             b.numero AS bda_numero, b.service_demandeur
      FROM bc
      LEFT JOIN fournisseurs f ON bc.fournisseur_id = f.id
      LEFT JOIN users        u ON bc.chef_id        = u.id
      LEFT JOIN bda          b ON bc.bda_id         = b.id
      WHERE bc.id = ?
    `).get(id)
    if (!bc) return null
    bc.lignes = db.prepare(`
      SELECT l.*, a.unite AS article_unite
      FROM bc_lignes l
      LEFT JOIN articles a ON l.article_id = a.id
      WHERE l.bc_id = ?
    `).all(id)
    return bc
  })

  // ── Créer ─────────────────────────────────────────────────
  ipcMain.handle('bc:create', (_, { bda_id, fournisseur_id, chef_id, delai_livraison, tva, observations, lignes }) => {
    const db  = getDB()
    const num = genNumero(db, 'BC', 'bc')

    // Calcul montants
    const ht  = lignes.reduce((s, l) => s + (l.quantite * l.prix_unitaire), 0)
    const tvaPct = tva ?? 19
    const ttc = ht * (1 + tvaPct / 100)

    const result = db.transaction(() => {
      const { lastInsertRowid: bcId } = db.prepare(`
        INSERT INTO bc (numero, date, bda_id, fournisseur_id, chef_id, statut,
                        delai_livraison, montant_ht, tva, montant_ttc, observations)
        VALUES (?, date('now'), ?, ?, ?, 'CREE', ?, ?, ?, ?, ?)
      `).run(num, bda_id || null, fournisseur_id, chef_id,
             delai_livraison || null, ht, tvaPct, ttc, observations || null)

      const ins = db.prepare(`
        INSERT INTO bc_lignes (bc_id, article_id, designation, quantite, prix_unitaire)
        VALUES (?, ?, ?, ?, ?)
      `)
      for (const l of lignes) {
        ins.run(bcId, l.article_id || null, l.designation, l.quantite, l.prix_unitaire)
      }

      // Si lié à un BDA, on le marque comme traité
      if (bda_id) {
        db.prepare("UPDATE bda SET statut = 'VALIDE' WHERE id = ? AND statut = 'VALIDE'").run(bda_id)
      }

      return { ok: true, id: bcId, numero: num }
    })()

    return result
  })

  // ── Changer statut ────────────────────────────────────────
  ipcMain.handle('bc:setStatut', (_, { id, statut }) => {
    const allowed = ['CREE','ENVOYE','LIVRAISON_PARTIELLE','LIVRE','CLOTURE']
    if (!allowed.includes(statut)) return { ok: false, error: 'Statut invalide' }
    getDB().prepare('UPDATE bc SET statut = ? WHERE id = ?').run(statut, id)
    return { ok: true }
  })

  // ── Supprimer (CREE seulement) ────────────────────────────
  ipcMain.handle('bc:delete', (_, id) => {
    const db = getDB()
    const bc = db.prepare('SELECT statut FROM bc WHERE id = ?').get(id)
    if (bc?.statut !== 'CREE') return { ok: false, error: 'Seul un BC en statut CREE peut être supprimé' }
    db.prepare('DELETE FROM bc WHERE id = ?').run(id)
    return { ok: true }
  })
}

module.exports = { register }