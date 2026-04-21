// electron/database/queries/bda.js
const { getDB } = require('../db')

// Génère un numéro auto : BDA-2024-0001
function genNumero(db, prefix) {
  const year  = new Date().getFullYear()
  const last  = db.prepare(`
    SELECT numero FROM ${prefix === 'BDA' ? 'bda' : 'bc'}
    WHERE numero LIKE '${prefix}-${year}-%'
    ORDER BY id DESC LIMIT 1
  `).get()

  const seq = last
    ? String(parseInt(last.numero.split('-')[2]) + 1).padStart(4, '0')
    : '0001'
  return `${prefix}-${year}-${seq}`
}

function register(ipcMain) {

  // ── Lister tous les BDA ───────────────────────────────────
  ipcMain.handle('bda:getAll', (_, filters = {}) => {
    const db = getDB()
    let sql = `
      SELECT b.*, u.nom || ' ' || u.prenom AS agent_nom
      FROM bda b
      LEFT JOIN users u ON b.agent_id = u.id
    `
    const params = []
    const where  = []

    if (filters.statut)  { where.push('b.statut = ?');           params.push(filters.statut) }
    if (filters.service) { where.push('b.service_demandeur LIKE ?'); params.push(`%${filters.service}%`) }
    if (where.length)    sql += ' WHERE ' + where.join(' AND ')

    sql += ' ORDER BY b.created_at DESC'
    return db.prepare(sql).all(...params)
  })

  // ── Détail d'un BDA avec ses lignes ───────────────────────
  ipcMain.handle('bda:getById', (_, id) => {
    const db  = getDB()
    const bda = db.prepare(`
      SELECT b.*, u.nom || ' ' || u.prenom AS agent_nom
      FROM bda b
      LEFT JOIN users u ON b.agent_id = u.id
      WHERE b.id = ?
    `).get(id)

    if (!bda) return null

    bda.lignes = db.prepare(`
      SELECT bl.*, a.designation AS article_designation, a.unite AS article_unite
      FROM bda_lignes bl
      LEFT JOIN articles a ON bl.article_id = a.id
      WHERE bl.bda_id = ?
    `).all(id)

    return bda
  })

  // ── Créer un BDA ──────────────────────────────────────────
  ipcMain.handle('bda:create', (_, { service_demandeur, agent_id, observations, lignes }) => {
    const db  = getDB()
    const num = genNumero(db, 'BDA')

    const result = db.transaction(() => {
      const { lastInsertRowid: bdaId } = db.prepare(`
        INSERT INTO bda (numero, date, service_demandeur, agent_id, statut, observations)
        VALUES (?, date('now'), ?, ?, 'BROUILLON', ?)
      `).run(num, service_demandeur, agent_id, observations)

      const insertLigne = db.prepare(`
        INSERT INTO bda_lignes (bda_id, article_id, designation_libre, quantite, unite, urgence)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      for (const l of lignes) {
        insertLigne.run(bdaId, l.article_id || null, l.designation_libre || null,
                        l.quantite, l.unite, l.urgence ? 1 : 0)
      }

      return { ok: true, id: bdaId, numero: num }
    })()

    return result
  })

  // ── Modifier un BDA (uniquement si BROUILLON) ─────────────
  ipcMain.handle('bda:update', (_, { id, service_demandeur, observations, lignes }) => {
    const db  = getDB()
    const bda = db.prepare('SELECT statut FROM bda WHERE id = ?').get(id)
    if (!bda)                    return { ok: false, error: 'BDA introuvable' }
    if (bda.statut !== 'BROUILLON') return { ok: false, error: 'Seul un BDA en brouillon peut être modifié' }

    db.transaction(() => {
      db.prepare('UPDATE bda SET service_demandeur = ?, observations = ? WHERE id = ?')
        .run(service_demandeur, observations, id)

      db.prepare('DELETE FROM bda_lignes WHERE bda_id = ?').run(id)

      const ins = db.prepare(`
        INSERT INTO bda_lignes (bda_id, article_id, designation_libre, quantite, unite, urgence)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      for (const l of lignes) {
        ins.run(id, l.article_id || null, l.designation_libre || null,
                l.quantite, l.unite, l.urgence ? 1 : 0)
      }
    })()

    return { ok: true }
  })

  // ── Soumettre (BROUILLON → SOUMIS) ────────────────────────
  ipcMain.handle('bda:soumettre', (_, id) => {
    const db  = getDB()
    const bda = db.prepare('SELECT statut FROM bda WHERE id = ?').get(id)
    if (bda?.statut !== 'BROUILLON') return { ok: false, error: 'Statut invalide' }

    db.prepare("UPDATE bda SET statut = 'SOUMIS' WHERE id = ?").run(id)
    return { ok: true }
  })

  // ── Valider (SOUMIS → VALIDÉ) — Chef seulement ────────────
  ipcMain.handle('bda:valider', (_, id) => {
    const db  = getDB()
    const bda = db.prepare('SELECT statut FROM bda WHERE id = ?').get(id)
    if (bda?.statut !== 'SOUMIS') return { ok: false, error: 'Statut invalide' }

    db.prepare("UPDATE bda SET statut = 'VALIDE' WHERE id = ?").run(id)
    return { ok: true }
  })

  // ── Rejeter (SOUMIS → REJETÉ) ────────────────────────────
  ipcMain.handle('bda:rejeter', (_, { id, observations }) => {
    const db  = getDB()
    db.prepare("UPDATE bda SET statut = 'REJETE', observations = ? WHERE id = ?")
      .run(observations, id)
    return { ok: true }
  })

  // ── Supprimer (BROUILLON seulement) ───────────────────────
  ipcMain.handle('bda:delete', (_, id) => {
    const db  = getDB()
    const bda = db.prepare('SELECT statut FROM bda WHERE id = ?').get(id)
    if (bda?.statut !== 'BROUILLON') return { ok: false, error: 'Seul un brouillon peut être supprimé' }

    db.prepare('DELETE FROM bda WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── BDA validés sans BC (pour créer un BC) ────────────────
  ipcMain.handle('bda:getValidedWithoutBC', () => {
    return getDB().prepare(`
      SELECT b.* FROM bda b
      WHERE b.statut = 'VALIDE'
      AND NOT EXISTS (SELECT 1 FROM bc WHERE bc.bda_id = b.id)
      ORDER BY b.date DESC
    `).all()
  })
}

module.exports = { register }