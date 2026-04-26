# Moyens Généraux — Application de gestion

Application desktop de gestion des bons de commande, stock et inventaire pour le service des Moyens Généraux.

## Prérequis

- **Node.js v18.x** — [Télécharger](https://nodejs.org/dist/v18.20.4/node-v18.20.4-x64.msi)
- **Git** — [Télécharger](https://git-scm.com)

## Installation

```bash
# 1. Cloner le projet
git clone https://github.com/Hyazid/MGX-app.git
cd MGX-app

# 2. Installer les dépendances
npm install

# 3. Rebuild le module SQLite pour Electron
npm run rebuild
```

## Lancer l'application

```bash
npm run dev
```

> Ouvre deux terminaux si `npm run dev` ne fonctionne pas :
> - Terminal 1 : `npm run dev:react`
> - Terminal 2 (après que Vite soit prêt) : `npm run dev:electron`

## Comptes par défaut

| Utilisateur | Mot de passe | Rôle |
|---|---|---|
| `admin` | `admin123` | Chef Moyens Généraux |
| `magasinier` | `mag123` | Magasinier |
| `comptable` | `cpt123` | Comptable |
| `agent` | `agt123` | Agent Administratif |

> ⚠️ Changez les mots de passe après la première connexion.

## Modules disponibles

- ✅ Bons de Demande d'Achat (BDA)
- ✅ Bons de Commande (BC) avec génération PDF
- ✅ Bons de Réception (BR)
- ✅ Décharges
- ✅ Gestion du Stock
- ✅ Inventaire Physique
- ✅ Articles & Fournisseurs
- ✅ Rapports & Export Excel
- ✅ Gestion des utilisateurs

## Stack technique

- Electron v22 + React 18 + Vite
- SQLite (better-sqlite3)
- TailwindCSS
- Compatible : Windows 7/10/11, Linux, macOS
