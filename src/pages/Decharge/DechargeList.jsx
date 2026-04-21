
// ============================================================
// src/pages/Decharge/DechargeList.jsx
// ============================================================
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { ClipboardCheck, Eye, Search, Plus } from 'lucide-react'
import { formatDate } from '@/utils/formatters'

export default function DechargeList() {
  const navigate          = useNavigate()
  const { can }           = usePermission()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    window.api.invoke('decharge:getAll').then(d => { setItems(d ?? []); setLoading(false) })
  }, [])

  const filtered = items.filter(i =>
    i.numero.toLowerCase().includes(search.toLowerCase()) ||
    (i.service_beneficiaire ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (i.fournisseur_nom      ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Décharges</h1>
          <p className="text-sm text-gray-500">{items.length} décharge(s)</p>
        </div>
        {can('decharge:create') && (
          <button onClick={() => navigate('/decharges/new/0')} className="btn-primary">
            <Plus className="w-4 h-4" /> Nouvelle décharge
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher numéro, service, fournisseur..." className="input pl-9" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardCheck className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400">Aucune décharge enregistrée</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Numéro','Date','BC','BR','Service bénéficiaire','Fournisseur','N° Facture','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{d.numero}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(d.date)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.bc_numero}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.br_numero}</td>
                  <td className="px-4 py-3 font-semibold">{d.service_beneficiaire}</td>
                  <td className="px-4 py-3 text-gray-500">{d.fournisseur_nom}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.num_facture || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/decharges/${d.id}`)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition">
                      <Eye className="w-4 h-4" />
                    </button>
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

