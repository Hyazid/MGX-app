const { getDB } = require('../db')

function genNumero(db) {
  const year = new Date().getFullYear()
  const last = db.prepare(`
    SELECT numero FROM decharges
    WHERE numero LIKE 'DCH-${year}-%'
    ORDER BY id DESC LIMIT 1
  `).get()
  const seq = last
    ? String(parseInt(last.numero.split('-')[2]) + 1).padStart(4, '0')
    : '0001'
  return `DCH-${year}-${seq}`
}

function register(ipcMain) {

  // ── Lister ────────────────────────────────────────────────
  ipcMain.handle('decharge:getAll', () => {
    return getDB().prepare(`
      SELECT d.*,
             bc.numero        AS bc_numero,
             br.numero        AS br_numero,
             f.nom            AS fournisseur_nom,
             u.nom || ' ' || u.prenom AS chef_nom
      FROM decharges d
      LEFT JOIN bc           ON d.bc_id   = bc.id
      LEFT JOIN br           ON d.br_id   = br.id
      LEFT JOIN fournisseurs f ON bc.fournisseur_id = f.id
      LEFT JOIN users        u ON d.chef_id = u.id
      ORDER BY d.created_at DESC
    `).all()
  })

  // ── Détail ────────────────────────────────────────────────
  ipcMain.handle('decharge:getById', (_, id) => {
    const db = getDB()
    const d  = db.prepare(`
      SELECT d.*,
             bc.numero AS bc_numero, br.numero AS br_numero,
             f.nom     AS fournisseur_nom,
             u.nom || ' ' || u.prenom AS chef_nom
      FROM decharges d
      LEFT JOIN bc           ON d.bc_id          = bc.id
      LEFT JOIN br           ON d.br_id           = br.id
      LEFT JOIN fournisseurs f ON bc.fournisseur_id = f.id
      LEFT JOIN users        u ON d.chef_id         = u.id
      WHERE d.id = ?
    `).get(id)
    if (!d) return null

    d.lignes = db.prepare(`
      SELECT dl.*, a.unite
      FROM decharge_lignes dl
      LEFT JOIN articles a ON dl.article_id = a.id
      WHERE dl.decharge_id = ?
    `).all(id)
    return d
  })

  // ── BR sans décharge (pour créer une décharge) ───────────
  ipcMain.handle('decharge:getBRSansDecharge', () => {
    return getDB().prepare(`
      SELECT br.*, bc.numero AS bc_numero, f.nom AS fournisseur_nom
      FROM br
      JOIN bc ON br.bc_id = bc.id
      LEFT JOIN fournisseurs f ON bc.fournisseur_id = f.id
      WHERE NOT EXISTS (
        SELECT 1 FROM decharges d WHERE d.br_id = br.id
      )
      ORDER BY br.date DESC
    `).all()
  })

  // ── Créer une décharge ────────────────────────────────────
  ipcMain.handle('decharge:create', (_, {
    bc_id, br_id, service_beneficiaire, chef_id,
    num_facture, date_facture, observations, lignes
  }) => {
    const db  = getDB()
    const num = genNumero(db)

    // Vérification : BR existe et pas déjà de décharge
    const existing = db.prepare('SELECT id FROM decharges WHERE br_id = ?').get(br_id)
    if (existing) return { ok: false, error: 'Une décharge existe déjà pour ce bon de réception' }

    const result = db.transaction(() => {
      const { lastInsertRowid: dId } = db.prepare(`
        INSERT INTO decharges
          (numero, date, bc_id, br_id, service_beneficiaire, chef_id,
           num_facture, date_facture, observations)
        VALUES (?, date('now'), ?, ?, ?, ?, ?, ?, ?)
      `).run(num, bc_id, br_id, service_beneficiaire, chef_id,
             num_facture || null, date_facture || null, observations || null)

      const ins = db.prepare(`
        INSERT INTO decharge_lignes (decharge_id, article_id, designation, quantite, observations)
        VALUES (?, ?, ?, ?, ?)
      `)
      for (const l of lignes) {
        ins.run(dId, l.article_id || null, l.designation, l.quantite, l.observations || null)
      }

      // Clôturer le BC
      db.prepare("UPDATE bc SET statut = 'CLOTURE' WHERE id = ?").run(bc_id)

      return { ok: true, id: dId, numero: num }
    })()

    return result
  })
}

module.exports = { register }