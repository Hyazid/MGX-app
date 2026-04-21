const { getDB } = require('../db')

function register(ipcMain) {

  // ── Stats Dashboard ───────────────────────────────────────
  ipcMain.handle('rapports:dashboard', () => {
    const db = getDB()
    return {
      bda_soumis:    db.prepare("SELECT COUNT(*) AS n FROM bda   WHERE statut = 'SOUMIS'").get().n,
      bda_valides:   db.prepare("SELECT COUNT(*) AS n FROM bda   WHERE statut = 'VALIDE'").get().n,
      bc_en_cours:   db.prepare("SELECT COUNT(*) AS n FROM bc    WHERE statut IN ('CREE','ENVOYE','LIVRAISON_PARTIELLE')").get().n,
      bc_ce_mois:    db.prepare("SELECT COUNT(*) AS n FROM bc    WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')").get().n,
      br_ce_mois:    db.prepare("SELECT COUNT(*) AS n FROM br    WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')").get().n,
      decharges_mois:db.prepare("SELECT COUNT(*) AS n FROM decharges WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')").get().n,
      stock_alertes: db.prepare("SELECT COUNT(*) AS n FROM articles WHERE actif=1 AND stock_actuel <= stock_minimum AND stock_minimum > 0").get().n,
      stock_rupture: db.prepare("SELECT COUNT(*) AS n FROM articles WHERE actif=1 AND stock_actuel <= 0").get().n,
      total_articles:db.prepare("SELECT COUNT(*) AS n FROM articles WHERE actif=1").get().n,
      montant_mois:  db.prepare("SELECT COALESCE(SUM(montant_ttc),0) AS n FROM bc WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')").get().n,
    }
  })

  // ── Rapport stock complet ─────────────────────────────────
  ipcMain.handle('rapports:stock', () => {
    return getDB().prepare(`
      SELECT a.*,
        COALESCE((SELECT SUM(ms.quantite) FROM mouvements_stock ms WHERE ms.article_id = a.id AND ms.type='ENTREE'), 0) AS total_entrees,
        COALESCE((SELECT SUM(ms.quantite) FROM mouvements_stock ms WHERE ms.article_id = a.id AND ms.type='SORTIE'),  0) AS total_sorties,
        CASE
          WHEN a.stock_actuel <= 0               THEN 'RUPTURE'
          WHEN a.stock_actuel <= a.stock_minimum THEN 'ALERTE'
          ELSE 'OK'
        END AS etat_stock
      FROM articles a
      WHERE a.actif = 1
      ORDER BY a.categorie, a.designation
    `).all()
  })

  // ── Rapport commandes par période ────────────────────────
  ipcMain.handle('rapports:commandes', (_, { date_debut, date_fin }) => {
    const db = getDB()
    return db.prepare(`
      SELECT bc.*,
             f.nom AS fournisseur_nom,
             u.nom || ' ' || u.prenom AS chef_nom,
             COUNT(bcl.id) AS nb_lignes
      FROM bc
      LEFT JOIN fournisseurs f ON bc.fournisseur_id = f.id
      LEFT JOIN users        u ON bc.chef_id        = u.id
      LEFT JOIN bc_lignes  bcl ON bcl.bc_id          = bc.id
      WHERE bc.date BETWEEN ? AND ?
      GROUP BY bc.id
      ORDER BY bc.date DESC
    `).all(date_debut, date_fin)
  })

  // ── Dépenses par fournisseur ──────────────────────────────
  ipcMain.handle('rapports:parFournisseur', (_, { date_debut, date_fin }) => {
    return getDB().prepare(`
      SELECT f.nom, f.id,
             COUNT(bc.id)          AS nb_commandes,
             SUM(bc.montant_ttc)   AS total_ttc,
             SUM(bc.montant_ht)    AS total_ht,
             MAX(bc.date)          AS derniere_commande
      FROM bc
      JOIN fournisseurs f ON bc.fournisseur_id = f.id
      WHERE bc.date BETWEEN ? AND ?
      GROUP BY f.id
      ORDER BY total_ttc DESC
    `).all(date_debut, date_fin)
  })

  // ── Mouvements stock par période ─────────────────────────
  ipcMain.handle('rapports:mouvements', (_, { date_debut, date_fin }) => {
    return getDB().prepare(`
      SELECT ms.*, a.designation, a.unite,
             u.nom || ' ' || u.prenom AS user_nom
      FROM mouvements_stock ms
      JOIN articles a ON ms.article_id = a.id
      LEFT JOIN users u ON ms.user_id = u.id
      WHERE ms.date BETWEEN ? AND ?
      ORDER BY ms.created_at DESC
    `).all(date_debut, date_fin)
  })
}

module.exports = { register }