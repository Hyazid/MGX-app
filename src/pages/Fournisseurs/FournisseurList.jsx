import { useEffect, useState } from 'react'
import { usePermission } from '@/hooks/usePermission'
import { Plus, Edit, Trash2, Search, Users, Phone, Mail } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

const empty = () => ({
  nom: '', adresse: '', telephone: '',
  email: '', nif: '', rc: '', rib: ''
})

export default function FournisseurList() {
  const { can } = usePermission()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const load = async () => {
    setLoading(true)
    const data = await window.api.invoke('fournisseurs:getAll')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(empty())
    setModal(true)
  }

  const openEdit = (f) => {
    setEditing(f.id)
    setForm({ ...f })
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.nom.trim()) {
      toast.error('Nom requis')
      return
    }

    setSaving(true)

    const res = editing
      ? await window.api.invoke('fournisseurs:update', { id: editing, ...form })
      : await window.api.invoke('fournisseurs:create', form)

    setSaving(false)

    if (res.ok) {
      toast.success(editing ? 'Modifié' : 'Créé')
      setModal(false)
      load()
    } else {
      toast.error(res.error)
    }
  }

  const handleDelete = async (id) => {
    const res = await window.api.invoke('fournisseurs:delete', id)
    if (res.ok) {
      toast.success('Supprimé')
      load()
    } else {
      toast.error(res.error)
    }
  }

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }))
  }

  const filtered = items.filter(i =>
    i.nom.toLowerCase().includes(search.toLowerCase()) ||
    (i.nif ?? '').includes(search) ||
    (i.telephone ?? '').includes(search)
  )

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fournisseurs</h1>
          <div className="flex gap-4 mt-1 text-sm text-gray-500">
            <span>{items.length} total</span>
            <span>{filtered.length} affiché(s)</span>
          </div>
        </div>

        {can('fournisseurs:manage') && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nouveau
          </button>
        )}
      </div>

      {/* SEARCH */}
      <div className="card p-4 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom, téléphone, NIF..."
            className="input pl-9 w-full focus:ring-2 focus:ring-black/10"
          />
        </div>

        <div className="text-sm text-gray-400">
          {filtered.length} résultat(s)
        </div>
      </div>

      {/* CONTENT */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">Aucun fournisseur</p>

            {can('fournisseurs:manage') && (
              <button
                onClick={openCreate}
                className="mt-4 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800"
              >
                Ajouter
              </button>
            )}
          </div>
        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">

            {filtered.map(f => (
              <div
                key={f.id}
                className="rounded-2xl border border-gray-100 p-4 bg-white hover:shadow-md transition"
              >

                {/* TOP */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{f.nom}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {f.adresse || '—'}
                    </p>
                  </div>

                  {can('fournisseurs:manage') && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(f)}
                        className="p-2 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setConfirm(f.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* CONTACT */}
                <div className="mt-4 space-y-2 text-sm">

                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    {f.telephone || '—'}
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    {f.email || '—'}
                  </div>

                </div>

                {/* META */}
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-400">
                  <span>NIF: {f.nif || '—'}</span>
                  <span>RC: {f.rc || '—'}</span>
                </div>

              </div>
            ))}

          </div>
        )}
      </div>

      {/* MODAL */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Modifier' : 'Nouveau fournisseur'}
        size="md"
      >
        <div className="space-y-4">

          <div>
            <label className="label">Nom *</label>
            <input
              value={form.nom}
              onChange={e => set('nom', e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Adresse</label>
            <textarea
              value={form.adresse}
              onChange={e => set('adresse', e.target.value)}
              rows={2}
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              value={form.telephone}
              onChange={e => set('telephone', e.target.value)}
              className="input"
              placeholder="Téléphone"
            />

            <input
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className="input"
              placeholder="Email"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <input value={form.nif} onChange={e => set('nif', e.target.value)} className="input" placeholder="NIF" />
            <input value={form.rc} onChange={e => set('rc', e.target.value)} className="input" placeholder="RC" />
            <input value={form.rib} onChange={e => set('rib', e.target.value)} className="input" placeholder="RIB" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">
              Annuler
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? '...' : editing ? 'Modifier' : 'Créer'}
            </button>
          </div>

        </div>
      </Modal>

      {/* CONFIRM */}
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        title="Supprimer ?"
        message="Action irréversible"
        danger
      />

    </div>
  )
}