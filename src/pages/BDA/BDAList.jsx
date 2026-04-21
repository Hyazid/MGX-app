
// ============================================================
// src/pages/BDA/BDAList.jsx  (stub fonctionnel)
// ============================================================
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { Plus, Eye, Edit, Trash2, Search } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/utils/formatters'
import toast from 'react-hot-toast'

const STATUT_COLOR = { BROUILLON:'gray', SOUMIS:'blue', VALIDE:'green', REJETE:'red' }
const STATUT_LABEL = { BROUILLON:'Brouillon', SOUMIS:'Soumis', VALIDE:'Validé', REJETE:'Rejeté' }

export default function BDAList() {
  const navigate = useNavigate()
  const { can }  = usePermission()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filtre, setFiltre]   = useState('')

  const load = async () => {
    setLoading(true)
    const data = await window.api.invoke('bda:getAll', { statut: filtre || undefined })
    setItems(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [filtre])

  const del = async (id) => {
    if (!confirm('Supprimer ce BDA ?')) return
    const r = await window.api.invoke('bda:delete', id)
    if (r.ok) { toast.success('Supprimé'); load() } else toast.error(r.error)
  }

  const filtered = items.filter(i =>
    i.numero.toLowerCase().includes(search.toLowerCase()) ||
    i.service_demandeur.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandes d'achat</h1>
          <p className="text-sm text-gray-500">{items.length} demande(s)</p>
        </div>
        {can('bda:create') && (
          <button onClick={() => navigate('/bda/new')} className="btn-primary">
            <Plus className="w-4 h-4" /> Nouvelle demande
          </button>
        )}
      </div>

      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..." className="input pl-9" />
        </div>
        <select value={filtre} onChange={e => setFiltre(e.target.value)} className="input w-auto">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">Aucun résultat</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Numéro','Date','Service','Agent','Statut','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{b.numero}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(b.date)}</td>
                  <td className="px-4 py-3 font-medium">{b.service_demandeur}</td>
                  <td className="px-4 py-3 text-gray-500">{b.agent_nom || '—'}</td>
                  <td className="px-4 py-3"><Badge color={STATUT_COLOR[b.statut]}>{STATUT_LABEL[b.statut]}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => navigate(`/bda/${b.id}`)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"><Eye className="w-4 h-4" /></button>
                      {can('bda:edit') && b.statut === 'BROUILLON' && (
                        <button onClick={() => navigate(`/bda/${b.id}/edit`)} className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition"><Edit className="w-4 h-4" /></button>
                      )}
                      {can('bda:create') && b.statut === 'BROUILLON' && (
                        <button onClick={() => del(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}