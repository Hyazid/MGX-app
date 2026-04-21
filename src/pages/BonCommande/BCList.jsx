import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { Plus, Eye, Trash2, Search } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { formatDate, formatMontant } from '@/utils/formatters'
import toast from 'react-hot-toast'

const S_COLOR = { CREE:'gray', ENVOYE:'blue', LIVRAISON_PARTIELLE:'amber', LIVRE:'teal', CLOTURE:'green' }
const S_LABEL = { CREE:'Créé', ENVOYE:'Envoyé', LIVRAISON_PARTIELLE:'Partiel', LIVRE:'Livré', CLOTURE:'Clôturé' }

export default function BCList() {
  const navigate      = useNavigate()
  const { can }       = usePermission()
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState('')
  const [confirm, setConfirm] = useState(null)

  const load = async () => {
    setLoading(true)
    const data = await window.api.invoke('bc:getAll', { statut: filtre || undefined })
    setItems(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [filtre])

  const del = async (id) => {
    const r = await window.api.invoke('bc:delete', id)
    if (r.ok) { toast.success('BC supprimé'); load() } else toast.error(r.error)
  }

  const filtered = items.filter(i =>
    i.numero.toLowerCase().includes(search.toLowerCase()) ||
    (i.fournisseur_nom ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bons de commande</h1>
          <p className="text-sm text-gray-500">{items.length} commande(s)</p>
        </div>
        {can('bc:create') && (
          <button onClick={() => navigate('/bc/new')} className="btn-primary">
            <Plus className="w-4 h-4" /> Nouveau BC
          </button>
        )}
      </div>

      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher numéro, fournisseur..." className="input pl-9" />
        </div>
        <select value={filtre} onChange={e => setFiltre(e.target.value)} className="input w-auto">
          <option value="">Tous les statuts</option>
          {Object.entries(S_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">Aucun bon de commande</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Numéro','Date','Fournisseur','Montant TTC','Délai livr.','Statut','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(bc => (
                <tr key={bc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{bc.numero}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(bc.date)}</td>
                  <td className="px-4 py-3 font-medium">{bc.fournisseur_nom}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{formatMontant(bc.montant_ttc)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(bc.delai_livraison)}</td>
                  <td className="px-4 py-3"><Badge color={S_COLOR[bc.statut]}>{S_LABEL[bc.statut]}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => navigate(`/bc/${bc.id}`)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition">
                        <Eye className="w-4 h-4" />
                      </button>
                      {can('bc:create') && bc.statut === 'CREE' && (
                        <button onClick={() => setConfirm(bc.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog open={confirm !== null} onClose={() => setConfirm(null)}
        onConfirm={() => del(confirm)}
        title="Supprimer ce BC ?" message="Cette action est irréversible." danger />
    </div>
  )
}