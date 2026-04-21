import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { Truck, Eye, Search, Plus, ShoppingCart } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { formatDate } from '@/utils/formatters'

const S_COLOR = { COMPLET: 'green', PARTIEL: 'amber' }
const S_LABEL = { COMPLET: 'Complet', PARTIEL: 'Partiel' }

export default function ReceptionList() {
  const navigate      = useNavigate()
  const { can }       = usePermission()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  // Modal sélection BC
  const [bcModal, setBcModal]   = useState(false)
  const [bcList, setBcList]     = useState([])
  const [bcSearch, setBcSearch] = useState('')

  useEffect(() => {
    window.api.invoke('br:getAll').then(d => { setItems(d ?? []); setLoading(false) })
  }, [])

  const openNewReception = async () => {
    // Charge les BC éligibles : ENVOYE ou LIVRAISON_PARTIELLE
    const all = await window.api.invoke('bc:getAll', {})
    const eligible = (all ?? []).filter(bc =>
      bc.statut === 'ENVOYE' || bc.statut === 'LIVRAISON_PARTIELLE'
    )
    setBcList(eligible)
    setBcSearch('')
    setBcModal(true)
  }

  const filteredBc = bcList.filter(bc =>
    bc.numero.toLowerCase().includes(bcSearch.toLowerCase()) ||
    (bc.fournisseur_nom ?? '').toLowerCase().includes(bcSearch.toLowerCase())
  )

  const filtered = items.filter(i =>
    i.numero.toLowerCase().includes(search.toLowerCase()) ||
    (i.bc_numero       ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (i.fournisseur_nom ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bons de Réception</h1>
          <p className="text-sm text-gray-500">{items.length} réception(s)</p>
        </div>
        {/* ✅ FIX 3 : bouton nouvelle réception */}
        {can('br:create') && (
          <button onClick={openNewReception} className="btn-primary">
            <Plus className="w-4 h-4" /> Nouvelle réception
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher numéro, BC, fournisseur..." className="input pl-9" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400">Aucune réception enregistrée</p>
            {can('br:create') && (
              <button onClick={openNewReception} className="btn-primary mt-4 mx-auto">
                <Plus className="w-4 h-4" /> Créer une réception
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Numéro BR','Date','BC lié','Fournisseur','Magasinier','Statut','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(br => (
                <tr key={br.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{br.numero}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(br.date)}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {br.bc_numero}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{br.fournisseur_nom}</td>
                  <td className="px-4 py-3 text-gray-500">{br.magasinier_nom}</td>
                  <td className="px-4 py-3">
                    <Badge color={S_COLOR[br.statut]}>{S_LABEL[br.statut]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/receptions/${br.id}`)}
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

      {/* Modal sélection BC */}
      <Modal open={bcModal} onClose={() => setBcModal(false)}
        title="Sélectionner un bon de commande" size="md">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={bcSearch} onChange={e => setBcSearch(e.target.value)}
              placeholder="Rechercher BC ou fournisseur..." className="input pl-9" autoFocus />
          </div>

          {filteredBc.length === 0 ? (
            <div className="py-10 text-center">
              <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucun bon de commande en attente de réception</p>
              <p className="text-xs text-gray-400 mt-1">
                Les BC doivent être au statut "Envoyé" ou "Livraison partielle"
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredBc.map(bc => (
                <button key={bc.id}
                  onClick={() => { setBcModal(false); navigate(`/receptions/new/${bc.id}`) }}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition text-left group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Truck className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-gray-900 text-sm">{bc.numero}</p>
                      <p className="text-xs text-gray-500">{bc.fournisseur_nom}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      bc.statut === 'LIVRAISON_PARTIELLE'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {bc.statut === 'LIVRAISON_PARTIELLE' ? 'Partiel' : 'Envoyé'}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(bc.date)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}