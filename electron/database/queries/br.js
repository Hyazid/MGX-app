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

  // ── Lister tous les BR ────────────────────────────────────
  ipcMain.handle('br:getAll', () => {
    return getDB().prepare(`
      SELECT br.*,
             bc.numero        AS bc_numero,
             f.nom            AS fournisseur_nom,
             u.nom || ' ' || u.prenom AS magasinier_nom
      FROM br
      LEFT JOIN bc           ON br.bc_id          = bc.id
      LEFT JOIN fournisseurs f ON bc.fournisseur_id = f.id
      LEFT JOIN users        u ON br.magasinier_id  = u.id
      ORDER BY br.created_at DESC
    `).all()
  })

  // ── Détail BR avec lignes ─────────────────────────────────
  ipcMain.handle('br:getById', (_, id) => {
    const db = getDB()
    const br = db.prepare(`
      SELECT br.*,
             bc.numero AS bc_numero, bc.fournisseur_id,
             f.nom     AS fournisseur_nom,
             u.nom || ' ' || u.prenom AS magasinier_nom
      FROM br
      LEFT JOIN bc           ON br.bc_id           = bc.id
      LEFT JOIN fournisseurs f ON bc.fournisseur_id  = f.id
      LEFT JOIN users        u ON br.magasinier_id   = u.id
      WHERE br.id = ?
    `).get(id)
    if (!br) return null

    br.lignes = db.prepare(`
      SELECT brl.*,
             bcl.designation, bcl.quantite AS qte_commandee,
             bcl.prix_unitaire,
             a.unite
      FROM br_lignes brl
      JOIN bc_lignes bcl ON brl.bc_ligne_id = bcl.id
      LEFT JOIN articles a ON bcl.article_id = a.id
      WHERE brl.br_id = ?
    `).all(id)
    return br
  })

  // ── Lignes BC pour pré-remplir le formulaire de réception ─
  ipcMain.handle('br:getBCLignes', (_, bcId) => {
    const db = getDB()
    // Récupère les lignes BC avec les quantités déjà reçues
    const lignes = db.prepare(`
      SELECT bcl.*,
             a.unite,
             COALESCE(SUM(brl.quantite_recue), 0) AS deja_recu
      FROM bc_lignes bcl
      LEFT JOIN articles a  ON bcl.article_id = a.id
      LEFT JOIN br_lignes brl ON brl.bc_ligne_id = bcl.id
      WHERE bcl.bc_id = ?
      GROUP BY bcl.id
    `).all(bcId)
    return lignes
  })

  // ── Créer un BR ───────────────────────────────────────────
  ipcMain.handle('br:create', (_, { bc_id, magasinier_id, observations, lignes }) => {
    const db  = getDB()
    const num = genNumero(db, 'BR', 'br')

    // Détermine si livraison complète ou partielle
    const bcLignes = db.prepare('SELECT * FROM bc_lignes WHERE bc_id = ?').all(bc_id)
    const isPartiel = lignes.some(l => {
      const bcL = bcLignes.find(b => b.id === l.bc_ligne_id)
      return bcL && Number(l.quantite_recue) < Number(bcL.quantite)
    })

    const result = db.transaction(() => {
      // 1. Créer le BR
      const { lastInsertRowid: brId } = db.prepare(`
        INSERT INTO br (numero, date, bc_id, magasinier_id, statut, observations)
        VALUES (?, date('now'), ?, ?, ?, ?)
      `).run(num, bc_id, magasinier_id, isPartiel ? 'PARTIEL' : 'COMPLET', observations || null)

      // 2. Insérer les lignes + mettre à jour le stock
      const insLigne = db.prepare(`
        INSERT INTO br_lignes (br_id, bc_ligne_id, quantite_recue, observations)
        VALUES (?, ?, ?, ?)
      `)
      const insMvt = db.prepare(`
        INSERT INTO mouvements_stock
          (article_id, type, quantite, date, reference_doc, user_id)
        VALUES (?, 'ENTREE', ?, date('now'), ?, ?)
      `)
      const updStock = db.prepare(`
        UPDATE articles SET stock_actuel = stock_actuel + ? WHERE id = ?
      `)

      for (const l of lignes) {
        if (Number(l.quantite_recue) <= 0) continue
        insLigne.run(brId, l.bc_ligne_id, l.quantite_recue, l.observations || null)

        // Récupère l'article lié à cette ligne BC
        const bcL = db.prepare('SELECT article_id FROM bc_lignes WHERE id = ?').get(l.bc_ligne_id)
        if (bcL?.article_id) {
          insMvt.run(bcL.article_id, l.quantite_recue, num, magasinier_id)
          updStock.run(l.quantite_recue, bcL.article_id)
        }
      }

      // 3. Mettre à jour le statut du BC
      const newBcStatut = isPartiel ? 'LIVRAISON_PARTIELLE' : 'LIVRE'
      db.prepare('UPDATE bc SET statut = ? WHERE id = ?').run(newBcStatut, bc_id)

      return { ok: true, id: brId, numero: num }
    })()

    return result
  })
}

module.exports = { register }