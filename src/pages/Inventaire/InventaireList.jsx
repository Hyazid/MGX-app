
// ============================================================
// src/pages/Inventaire/InventaireList.jsx
// ============================================================
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { useAuthStore } from '@/store/authStore'
import { ClipboardList, Plus, Eye, XCircle, AlertTriangle } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/utils/formatters'
import toast from 'react-hot-toast'

const S_COLOR = { EN_COURS:'blue', VALIDE:'green', ANNULE:'red' }
const S_LABEL = { EN_COURS:'En cours', VALIDE:'Validé', ANNULE:'Annulé' }

export default function InventaireList() {
  const navigate    = useNavigate()
  const { can }     = usePermission()
  const user        = useAuthStore(s => s.user)
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const data = await window.api.invoke('inventaire:getAll')
    setItems(data ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    const res = await window.api.invoke('inventaire:create', {
      user_id: user.id,
      observations: ''
    })
    if (res.ok) {
      toast.success('Inventaire créé — snapshot du stock actuel effectué')
      navigate(`/inventaire/${res.id}`)
    } else {
      // Déjà un en cours
      toast.error(res.error)
      if (res.id) navigate(`/inventaire/${res.id}`)
    }
  }

  const handleAnnuler = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Annuler cet inventaire ?')) return
    await window.api.invoke('inventaire:annuler', id)
    toast.success('Inventaire annulé')
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventaire Physique</h1>
          <p className="text-sm text-gray-500">{items.length} inventaire(s)</p>
        </div>
        {can('inventaire:create') && (
          <button onClick={handleCreate} className="btn-primary">
            <Plus className="w-4 h-4" /> Nouvel inventaire
          </button>
        )}
      </div>

      {/* Alerte inventaire en cours */}
      {items.some(i => i.statut === 'EN_COURS') && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">Inventaire en cours</p>
            <p className="text-xs text-blue-600">Un inventaire est actuellement ouvert. Cliquez sur "Saisir" pour continuer.</p>
          </div>
          <button
            onClick={() => navigate(`/inventaire/${items.find(i => i.statut === 'EN_COURS').id}`)}
            className="btn-primary text-xs px-3 py-2 bg-blue-600 hover:bg-blue-700">
            Continuer →
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Chargement...</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400">Aucun inventaire</p>
            {can('inventaire:create') && (
              <button onClick={handleCreate} className="btn-primary mt-4 mx-auto">
                <Plus className="w-4 h-4" /> Démarrer le premier inventaire
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Date début','Date fin','Articles','Écarts totaux','Réalisé par','Statut','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/inventaire/${inv.id}`)}>
                  <td className="px-4 py-3 font-medium">{formatDate(inv.date_debut)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(inv.date_fin) || '—'}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className="font-bold text-gray-900">{inv.nb_lignes}</span>
                    <span className="text-xs text-gray-400 ml-1">articles</span>
                  </td>
                  <td className="px-4 py-3">
                    {inv.total_ecart > 0
                      ? <span className="font-bold text-amber-600">{inv.total_ecart}</span>
                      : <span className="text-green-600 font-semibold text-xs">Aucun écart</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{inv.user_nom || '—'}</td>
                  <td className="px-4 py-3"><Badge color={S_COLOR[inv.statut]}>{S_LABEL[inv.statut]}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/inventaire/${inv.id}`)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition">
                        <Eye className="w-4 h-4" />
                      </button>
                      {inv.statut === 'EN_COURS' && can('inventaire:create') && (
                        <button onClick={(e) => handleAnnuler(inv.id, e)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition">
                          <XCircle className="w-4 h-4" />
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
    </div>
  )
}
