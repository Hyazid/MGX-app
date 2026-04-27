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
## screenshots
<img width="1224" height="653" alt="Screenshot 2026-04-27 200715" src="https://github.com/user-attachments/assets/a0199992-7c9e-4cc4-bdcf-3d53c407b833" />
<img width="1232" height="562" alt="Screenshot 2026-04-27 200650" src="https://github.com/user-attachments/assets/bfdec59e-1503-475d-acb9-d33ac949a141" />
<img width="1228" height="534" alt="Screenshot 2026-04-27 200630" src="https://github.com/user-attachments/assets/65974825-af1f-401b-a8d7-f803762c92d1" />
<img width="1241" height="580" alt="Screenshot 2026-04-27 200616" src="https://github.com/user-attachments/assets/cdbe9ba9-311f-4d8f-ba5e-480c73b0b96f" />
<img width="1199" height="642" alt="Screenshot 2026-04-27 200557" src="https://github.com/user-attachments/assets/57a3b2d1-7593-4594-a914-d1376cdf51b4" />
<img width="1238" height="610" alt="Screenshot 2026-04-27 200539" src="https://github.com/user-attachments/assets/94c430b7-fa89-43d4-9789-739d3bd2e1ad" />
<img width="1235" height="619" alt="Screenshot 2026-04-27 200524" src="https://github.com/user-attachments/assets/bb67e250-632f-4f41-8b98-ba9e2607b005" />
<img width="1247" height="630" alt="Screenshot 2026-04-27 200449" src="https://github.com/user-attachments/assets/11b3bd84-7c4a-4d29-8850-2a98dec82c31" />

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
