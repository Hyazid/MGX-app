import { useEffect, useState } from 'react'
import { usePermission } from '@/hooks/usePermission'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import {
  Users, Plus, Edit, Power, Key,
  Shield, Search, CheckCircle, XCircle
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { getRoleLabel } from '@/utils/permissions'
import { formatDate } from '@/utils/formatters'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'chef_moyens_generaux', label: 'Chef Moyens Généraux', color: 'bg-blue-100 text-blue-800'   },
  { value: 'agent_administratif',  label: 'Agent Administratif',  color: 'bg-purple-100 text-purple-800'},
  { value: 'magasinier',           label: 'Magasinier',           color: 'bg-amber-100 text-amber-800'  },
  { value: 'comptable',            label: 'Comptable',            color: 'bg-green-100 text-green-800'  },
]

const emptyForm = () => ({
  nom: '', prenom: '', username: '', password: '', role: 'agent_administratif'
})

const emptyPwdForm = () => ({ password: '', confirm: '' })

export default function UsersManagement() {
  const { can }    = usePermission()
  const currentUser = useAuthStore(s => s.user)
  const navigate   = useNavigate()

  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modals
  const [userModal, setUserModal]   = useState(false)
  const [pwdModal,  setPwdModal]    = useState(null)   // user obj
  const [toggleConfirm, setToggleConfirm] = useState(null) // user obj

  const [form,    setForm]    = useState(emptyForm())
  const [editing, setEditing] = useState(null)
  const [pwdForm, setPwdForm] = useState(emptyPwdForm())
  const [saving,  setSaving]  = useState(false)

  // Guard : seul chef_moyens_generaux peut accéder
  useEffect(() => {
    if (!can('users:manage')) { navigate('/dashboard'); return }
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const data = await window.api.invoke('users:getAll')
    setUsers(data ?? [])
    setLoading(false)
  }

  const openCreate = () => {
    setEditing(null); setForm(emptyForm()); setUserModal(true)
  }

  const openEdit = (u) => {
    setEditing(u)
    setForm({ nom: u.nom, prenom: u.prenom, username: u.username, password: '', role: u.role })
    setUserModal(true)
  }

  const handleSave = async () => {
    if (!form.nom.trim() || !form.prenom.trim()) { toast.error('Nom et prénom requis'); return }
    if (!form.username.trim())                    { toast.error('Username requis'); return }
    if (!editing && !form.password.trim())        { toast.error('Mot de passe requis pour un nouvel utilisateur'); return }
    if (!editing && form.password.length < 6)     { toast.error('Mot de passe : 6 caractères minimum'); return }

    setSaving(true)
    let res
    if (editing) {
      // Modification : on ne change que les infos, pas le mot de passe ici
      res = await window.api.invoke('users:update', {
        id: editing.id, nom: form.nom, prenom: form.prenom,
        username: form.username, role: form.role
      })
    } else {
      res = await window.api.invoke('users:create', {
        nom: form.nom, prenom: form.prenom,
        username: form.username, password: form.password, role: form.role
      })
    }
    setSaving(false)

    if (res.ok) {
      toast.success(editing ? 'Utilisateur modifié' : 'Utilisateur créé')
      setUserModal(false); load()
    } else toast.error(res.error)
  }

  const handleChangePwd = async () => {
    if (!pwdForm.password.trim())                   { toast.error('Mot de passe requis'); return }
    if (pwdForm.password.length < 6)                { toast.error('6 caractères minimum'); return }
    if (pwdForm.password !== pwdForm.confirm)       { toast.error('Les mots de passe ne correspondent pas'); return }

    setSaving(true)
    const res = await window.api.invoke('users:changePassword', {
      id: pwdModal.id, newPassword: pwdForm.password
    })
    setSaving(false)
    if (res.ok) { toast.success('Mot de passe modifié'); setPwdModal(null) }
    else          toast.error(res.error)
  }

  const handleToggle = async (u) => {
    const res = await window.api.invoke('users:toggleActif', { id: u.id })
    if (res.ok) {
      toast.success(u.actif ? `${u.prenom} désactivé` : `${u.prenom} activé`)
      load()
    } else toast.error(res.error)
  }

  const set    = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setPwd = (k, v) => setPwdForm(f => ({ ...f, [k]: v }))

  const filtered = users.filter(u =>
    `${u.nom} ${u.prenom} ${u.username}`.toLowerCase().includes(search.toLowerCase())
  )

  const roleConfig = Object.fromEntries(ROLES.map(r => [r.value, r]))

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <p className="text-sm text-gray-500">{users.length} compte(s) enregistré(s)</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Nouvel utilisateur
        </button>
      </div>

      {/* Stats par rôle */}
      <div className="grid grid-cols-4 gap-3">
        {ROLES.map(r => {
          const count = users.filter(u => u.role === r.value && u.actif).length
          return (
            <div key={r.value} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${r.color}`}>
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-black text-gray-900">{count}</p>
                <p className="text-xs text-gray-400 leading-tight">{r.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtre */}
      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, username..." className="input pl-9" />
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Chargement...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Utilisateur','Username','Rôle','Statut','Créé le','Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(u => {
                const rc = roleConfig[u.role]
                const isMe = u.id === currentUser?.id
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 transition ${!u.actif ? 'opacity-50' : ''}`}>

                    {/* Avatar + nom */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {u.prenom?.[0]}{u.nom?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{u.prenom} {u.nom}</p>
                          {isMe && <p className="text-xs text-blue-500 font-medium">Vous</p>}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono text-gray-600">{u.username}</td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${rc?.color || 'bg-gray-100 text-gray-700'}`}>
                        <Shield className="w-3 h-3" />
                        {rc?.label || u.role}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {u.actif
                        ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Actif
                          </span>
                        : <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Inactif
                          </span>}
                    </td>

                    <td className="px-5 py-4 text-gray-400 text-xs">{formatDate(u.created_at)}</td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {/* Modifier infos */}
                        <button onClick={() => openEdit(u)} title="Modifier"
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition">
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Changer mot de passe */}
                        <button onClick={() => { setPwdModal(u); setPwdForm(emptyPwdForm()) }}
                          title="Changer le mot de passe"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition">
                          <Key className="w-4 h-4" />
                        </button>

                        {/* Activer / Désactiver (pas sur soi-même) */}
                        {!isMe && (
                          <button onClick={() => setToggleConfirm(u)}
                            title={u.actif ? 'Désactiver' : 'Activer'}
                            className={`p-1.5 rounded-lg transition ${
                              u.actif
                                ? 'hover:bg-red-50 text-gray-400 hover:text-red-600'
                                : 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                            }`}>
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal créer / modifier */}
      <Modal open={userModal} onClose={() => setUserModal(false)}
        title={editing ? `Modifier — ${editing.prenom} ${editing.nom}` : 'Nouvel utilisateur'}
        size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prénom <span className="text-red-500">*</span></label>
              <input value={form.prenom} onChange={e => set('prenom', e.target.value)}
                className="input" placeholder="ex: Mohamed" />
            </div>
            <div>
              <label className="label">Nom <span className="text-red-500">*</span></label>
              <input value={form.nom} onChange={e => set('nom', e.target.value)}
                className="input" placeholder="ex: Benali" />
            </div>
          </div>

          <div>
            <label className="label">Nom d'utilisateur <span className="text-red-500">*</span></label>
            <input value={form.username} onChange={e => set('username', e.target.value)}
              className="input" placeholder="ex: m.benali" autoComplete="off" />
            <p className="text-xs text-gray-400 mt-1">Utilisé pour la connexion. Sans espaces.</p>
          </div>

          {!editing && (
            <div>
              <label className="label">Mot de passe <span className="text-red-500">*</span></label>
              <input type="password" value={form.password}
                onChange={e => set('password', e.target.value)}
                className="input" placeholder="Min. 6 caractères" autoComplete="new-password" />
            </div>
          )}

          <div>
            <label className="label">Rôle <span className="text-red-500">*</span></label>
            <select value={form.role} onChange={e => set('role', e.target.value)} className="input">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {/* Résumé permissions */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Accès pour ce rôle</p>
            <PermissionsSummary role={form.role} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setUserModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal changement mot de passe */}
      <Modal open={!!pwdModal} onClose={() => setPwdModal(null)}
        title={`Changer le mot de passe — ${pwdModal?.prenom}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Nouveau mot de passe</label>
            <input type="password" value={pwdForm.password}
              onChange={e => setPwd('password', e.target.value)}
              className="input" placeholder="Min. 6 caractères" autoFocus />
          </div>
          <div>
            <label className="label">Confirmer</label>
            <input type="password" value={pwdForm.confirm}
              onChange={e => setPwd('confirm', e.target.value)}
              className="input" placeholder="Répéter le mot de passe" />
            {pwdForm.confirm && pwdForm.password !== pwdForm.confirm && (
              <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setPwdModal(null)} className="btn-secondary">Annuler</button>
            <button onClick={handleChangePwd} disabled={saving} className="btn-primary">
              <Key className="w-4 h-4" />
              {saving ? 'Modification...' : 'Changer le mot de passe'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm toggle actif */}
      <ConfirmDialog
        open={!!toggleConfirm}
        onClose={() => setToggleConfirm(null)}
        onConfirm={() => handleToggle(toggleConfirm)}
        title={toggleConfirm?.actif ? 'Désactiver cet utilisateur ?' : 'Activer cet utilisateur ?'}
        message={toggleConfirm?.actif
          ? `${toggleConfirm?.prenom} ${toggleConfirm?.nom} ne pourra plus se connecter.`
          : `${toggleConfirm?.prenom} ${toggleConfirm?.nom} pourra à nouveau se connecter.`}
        danger={toggleConfirm?.actif}
      />
    </div>
  )
}

// Résumé visuel des permissions par rôle
function PermissionsSummary({ role }) {
  const perms = {
    chef_moyens_generaux: ['BDA : créer, valider, rejeter', 'BC : créer, gérer', 'Réceptions', 'Décharges', 'Stock : voir + ajuster', 'Inventaire', 'Fournisseurs', 'Rapports', 'Utilisateurs'],
    agent_administratif:  ['BDA : créer, modifier', 'BC : voir', 'Décharges : voir', 'Stock : voir'],
    magasinier:           ['BC : voir', 'Réceptions : créer', 'Stock : voir + sorties', 'Inventaire : saisir'],
    comptable:            ['BDA, BC, BR : voir', 'Décharges : voir', 'Stock : voir', 'Rapports'],
  }
  const list = perms[role] || []
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map(p => (
        <span key={p} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-lg">
          {p}
        </span>
      ))}
    </div>
  )
}