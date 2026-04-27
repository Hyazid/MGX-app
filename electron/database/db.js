const Database = require('better-sqlite3')
const path     = require('path')
const fs       = require('fs')
const { app }  = require('electron')

let db = null

function getDBPath() {
  const base = app.isPackaged
    ? app.getPath('userData')
    : path.join(__dirname, '../../')
  return path.join(base, 'moyens_generaux.db')
}

function initDB() {
  const dbPath = getDBPath()
  console.log('[DB] Chemin :', dbPath)

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations()
  seedDefaultUsers()

  console.log('[DB] Initialisée avec succès')
  return db
}

function getDB() {
  if (!db) throw new Error('DB non initialisée. Appelle initDB() en premier.')
  return db
}

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT    NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const migrations = [{ name: '001_init', sql: migration_001 }]

  for (const m of migrations) {
    const already = db.prepare('SELECT id FROM _migrations WHERE name = ?').get(m.name)
    if (!already) {
      db.exec(m.sql)
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(m.name)
      console.log(`[DB] Migration appliquée : ${m.name}`)
    }
  }
}

const migration_001 = `
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nom           TEXT    NOT NULL,
    prenom        TEXT    NOT NULL,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK(role IN (
                    'chef_moyens_generaux','magasinier','comptable','agent_administratif'
                  )),
    actif         INTEGER NOT NULL DEFAULT 1,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS fournisseurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nom TEXT NOT NULL,
    adresse TEXT, telephone TEXT, email TEXT, nif TEXT, rc TEXT, rib TEXT,
    actif INTEGER NOT NULL DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT, designation TEXT NOT NULL,
    reference TEXT UNIQUE, unite TEXT NOT NULL DEFAULT 'pcs', categorie TEXT,
    stock_actuel REAL NOT NULL DEFAULT 0, stock_minimum REAL NOT NULL DEFAULT 0,
    localisation TEXT, actif INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS bda (
    id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT NOT NULL UNIQUE,
    date DATE NOT NULL, service_demandeur TEXT NOT NULL,
    agent_id INTEGER REFERENCES users(id),
    statut TEXT NOT NULL DEFAULT 'BROUILLON'
      CHECK(statut IN ('BROUILLON','SOUMIS','VALIDE','REJETE')),
    observations TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS bda_lignes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bda_id INTEGER NOT NULL REFERENCES bda(id) ON DELETE CASCADE,
    article_id INTEGER REFERENCES articles(id),
    designation_libre TEXT, quantite REAL NOT NULL,
    unite TEXT NOT NULL DEFAULT 'pcs', urgence INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS bc (
    id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT NOT NULL UNIQUE,
    date DATE NOT NULL, bda_id INTEGER REFERENCES bda(id),
    fournisseur_id INTEGER NOT NULL REFERENCES fournisseurs(id),
    chef_id INTEGER NOT NULL REFERENCES users(id),
    statut TEXT NOT NULL DEFAULT 'CREE'
      CHECK(statut IN ('CREE','ENVOYE','LIVRAISON_PARTIELLE','LIVRE','CLOTURE')),
    delai_livraison DATE, montant_ht REAL NOT NULL DEFAULT 0,
    tva REAL NOT NULL DEFAULT 19, montant_ttc REAL NOT NULL DEFAULT 0,
    observations TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS bc_lignes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bc_id INTEGER NOT NULL REFERENCES bc(id) ON DELETE CASCADE,
    article_id INTEGER REFERENCES articles(id),
    designation TEXT NOT NULL, quantite REAL NOT NULL,
    prix_unitaire REAL NOT NULL DEFAULT 0,
    montant REAL GENERATED ALWAYS AS (quantite * prix_unitaire) STORED
  );
  CREATE TABLE IF NOT EXISTS br (
    id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT NOT NULL UNIQUE,
    date DATE NOT NULL, bc_id INTEGER NOT NULL REFERENCES bc(id),
    magasinier_id INTEGER NOT NULL REFERENCES users(id),
    statut TEXT NOT NULL DEFAULT 'COMPLET'
      CHECK(statut IN ('COMPLET','PARTIEL')),
    observations TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS br_lignes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    br_id INTEGER NOT NULL REFERENCES br(id) ON DELETE CASCADE,
    bc_ligne_id INTEGER NOT NULL REFERENCES bc_lignes(id),
    quantite_recue REAL NOT NULL, observations TEXT
  );
  CREATE TABLE IF NOT EXISTS decharges (
    id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT NOT NULL UNIQUE,
    date DATE NOT NULL, bc_id INTEGER NOT NULL REFERENCES bc(id),
    br_id INTEGER NOT NULL REFERENCES br(id),
    service_beneficiaire TEXT NOT NULL,
    chef_id INTEGER NOT NULL REFERENCES users(id),
    num_facture TEXT, date_facture DATE, observations TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS decharge_lignes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    decharge_id INTEGER NOT NULL REFERENCES decharges(id) ON DELETE CASCADE,
    article_id INTEGER REFERENCES articles(id),
    designation TEXT NOT NULL, quantite REAL NOT NULL, observations TEXT
  );
  CREATE TABLE IF NOT EXISTS mouvements_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL REFERENCES articles(id),
    type TEXT NOT NULL CHECK(type IN ('ENTREE','SORTIE','AJUSTEMENT')),
    quantite REAL NOT NULL, date DATE NOT NULL,
    reference_doc TEXT, service TEXT,
    user_id INTEGER REFERENCES users(id),
    observations TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS inventaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT, date_debut DATE NOT NULL,
    date_fin DATE, statut TEXT NOT NULL DEFAULT 'EN_COURS'
      CHECK(statut IN ('EN_COURS','VALIDE','ANNULE')),
    user_id INTEGER REFERENCES users(id),
    observations TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS inventaire_lignes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventaire_id INTEGER NOT NULL REFERENCES inventaires(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES articles(id),
    stock_theorique REAL NOT NULL, stock_reel REAL NOT NULL DEFAULT 0,
    ecart REAL GENERATED ALWAYS AS (stock_reel - stock_theorique) STORED,
    observations TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_bda_statut  ON bda(statut);
  CREATE INDEX IF NOT EXISTS idx_bc_statut   ON bc(statut);
  CREATE INDEX IF NOT EXISTS idx_br_bc       ON br(bc_id);
  CREATE INDEX IF NOT EXISTS idx_mvt_article ON mouvements_stock(article_id);
`

function seedDefaultUsers() {
  const bcrypt = require('bcryptjs')
  const count = db.prepare('SELECT COUNT(*) as n FROM users').get().n
  if (count > 0) return

  const hash = pwd => bcrypt.hashSync(pwd, 10)
  const ins  = db.prepare(`
    INSERT INTO users (nom, prenom, username, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `)
  const seed = db.transaction(() => {
    ins.run('Admin',     'Système', 'admin',      hash('admin123'), 'chef_moyens_generaux')
    ins.run('Magasin',   'Défaut',  'magasinier', hash('mag123'),   'magasinier')
    ins.run('Comptable', 'Défaut',  'comptable',  hash('cpt123'),   'comptable')
    ins.run('Agent',     'Défaut',  'agent',      hash('agt123'),   'agent_administratif')
  })
  seed()
  console.log('[DB] Utilisateurs par défaut créés')
}

module.exports = { initDB, getDB }