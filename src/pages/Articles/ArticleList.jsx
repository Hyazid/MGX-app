import { useEffect, useState } from 'react'
import { usePermission } from '@/hooks/usePermission'
import { Plus, Edit, Trash2, Search, Package, AlertTriangle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

const UNITES = ['pcs','kg','l','m','m²','m³','boite','carton','rouleau','sac','lot']

const empty = () => ({
  designation: '', reference: '', unite: 'pcs',
  categorie: '', stock_minimum: 0, localisation: ''
})

export default function ArticleList() {
  const { can }           = usePermission()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)   // null = création
  const [form, setForm]       = useState(empty())
  const [saving, setSaving]   = useState(false)
  const [confirm, setConfirm] = useState(null)   // id à supprimer

  const load = async () => {
    setLoading(true)
    const data = await window.api.invoke('articles:getAll')
    setItems(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(empty()); setModal(true) }
  const openEdit   = (a)  => { setEditing(a.id); setForm({ ...a }); setModal(true) }

  const handleSave = async () => {
    if (!form.designation.trim()) { toast.error('Désignation requise'); return }
    setSaving(true)
    const res = editing
      ? await window.api.invoke('articles:update', { id: editing, ...form })
      : await window.api.invoke('articles:create', form)
    setSaving(false)
    if (res.ok) {
      toast.success(editing ? 'Article modifié' : 'Article créé')
      setModal(false); load()
    } else toast.error(res.error)
  }

  const handleDelete = async (id) => {
    const res = await window.api.invoke('articles:delete', id)
    if (res.ok) { toast.success('Article supprimé'); load() }
    else          toast.error(res.error)
  }

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }))

  const filtered = items.filter(i =>
    i.designation.toLowerCase().includes(search.toLowerCase()) ||
    (i.reference ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (i.categorie  ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Articles / Matériaux</h1>
          <p className="text-sm text-gray-500">{items.length} article(s) dans le catalogue</p>
        </div>
        {can('articles:manage') && (
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" /> Nouvel article
          </button>
        )}
      </div>

      {/* Barre recherche */}
      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par désignation, référence..." className="input pl-9" />
        </div>
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400">Aucun article trouvé</p>
            {can('articles:manage') && (
              <button onClick={openCreate} className="btn-primary mt-4 mx-auto">
                <Plus className="w-4 h-4" /> Ajouter le premier article
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Désignation','Référence','Unité','Catégorie','Stock actuel','Stock min','Localisation','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.designation}</td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{a.reference || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{a.unite}</td>
                  <td className="px-4 py-3 text-gray-500">{a.categorie || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${a.stock_actuel <= a.stock_minimum ? 'text-red-600' : 'text-green-700'}`}>
                      {a.stock_actuel}
                    </span>
                    {a.stock_actuel <= a.stock_minimum && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline ml-1" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a.stock_minimum}</td>
                  <td className="px-4 py-3 text-gray-500">{a.localisation || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {can('articles:manage') && (
                        <>
                          <button onClick={() => openEdit(a)}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirm(a.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal créer/modifier */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Modifier l\'article' : 'Nouvel article'} size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Désignation <span className="text-red-500">*</span></label>
            <input value={form.designation} onChange={e => f('designation', e.target.value)}
              className="input" placeholder="ex: Ramette papier A4 80g" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Référence</label>
              <input value={form.reference} onChange={e => f('reference', e.target.value)}
                className="input" placeholder="ex: REF-001" />
            </div>
            <div>
              <label className="label">Unité</label>
              <select value={form.unite} onChange={e => f('unite', e.target.value)} className="input">
                {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Catégorie</label>
              <input value={form.categorie} onChange={e => f('categorie', e.target.value)}
                className="input" placeholder="ex: Fournitures bureau" />
            </div>
            <div>
              <label className="label">Localisation</label>
              <input value={form.localisation} onChange={e => f('localisation', e.target.value)}
                className="input" placeholder="ex: Étagère A3" />
            </div>
          </div>
          <div>
            <label className="label">Stock minimum (alerte)</label>
            <input type="number" min="0" step="1" value={form.stock_minimum}
              onChange={e => f('stock_minimum', Number(e.target.value))} className="input w-32" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm suppression */}
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        title="Supprimer l'article ?"
        message="Cet article sera désactivé. Les données historiques sont conservées."
        danger
      />
    </div>
  )
}