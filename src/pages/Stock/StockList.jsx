import { useEffect, useState } from 'react'
import { usePermission } from '@/hooks/usePermission'
import { useAuthStore } from '@/store/authStore'
import {
  Package, Search, ArrowDownCircle, ArrowUpCircle,
  AlertTriangle, CheckCircle, XCircle, History
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { formatDate, formatQte } from '@/utils/formatters'
import toast from 'react-hot-toast'

const ETAT = {
  OK:      { color: 'text-green-700 bg-green-50',  icon: CheckCircle,    label: 'OK' },
  ALERTE:  { color: 'text-amber-700 bg-amber-50',  icon: AlertTriangle,  label: 'Alerte' },
  RUPTURE: { color: 'text-red-700   bg-red-50',    icon: XCircle,        label: 'Rupture' },
}

export default function StockList() {
  const { can }   = usePermission()
  const user      = useAuthStore(s => s.user)
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEtat, setFilterEtat] = useState('')

  // Modals
  const [sortieModal, setSortieModal]     = useState(null)  // article
  const [histoModal, setHistoModal]       = useState(null)  // article
  const [mouvements, setMouvements]       = useState([])
  const [sortieForm, setSortieForm]       = useState({ quantite: 1, service: '', observations: '' })

  const load = async () => {
    setLoading(true)
    const data = await window.api.invoke('stock:getAll')
    setItems(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openHisto = async (art) => {
    setHistoModal(art)
    const data = await window.api.invoke('stock:getMouvements', { article_id: art.id })
    setMouvements(data ?? [])
  }

  const openSortie = (art) => {
    setSortieModal(art)
    setSortieForm({ quantite: 1, service: '', observations: '' })
  }

  const handleSortie = async () => {
    if (!sortieForm.service.trim()) { toast.error('Service bénéficiaire requis'); return }
    if (sortieForm.quantite <= 0)  { toast.error('Quantité invalide'); return }
    const res = await window.api.invoke('stock:sortie', {
      article_id:   sortieModal.id,
      quantite:     Number(sortieForm.quantite),
      service:      sortieForm.service,
      user_id:      user.id,
      observations: sortieForm.observations
    })
    if (res.ok) {
      toast.success('Sortie enregistrée — stock mis à jour')
      setSortieModal(null); load()
    } else toast.error(res.error)
  }

  // Stats rapides
  const stats = {
    total:   items.length,
    ok:      items.filter(i => i.etat_stock === 'OK').length,
    alerte:  items.filter(i => i.etat_stock === 'ALERTE').length,
    rupture: items.filter(i => i.etat_stock === 'RUPTURE').length,
  }

  const filtered = items
    .filter(i => !filterEtat || i.etat_stock === filterEtat)
    .filter(i =>
      i.designation.toLowerCase().includes(search.toLowerCase()) ||
      (i.reference  ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (i.categorie  ?? '').toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion du Stock</h1>
        <p className="text-sm text-gray-500">État en temps réel de tous les articles</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total articles', value: stats.total,   color: 'blue',  icon: Package       },
          { label: 'En stock',       value: stats.ok,      color: 'green', icon: CheckCircle   },
          { label: 'En alerte',      value: stats.alerte,  color: 'amber', icon: AlertTriangle },
          { label: 'En rupture',     value: stats.rupture, color: 'red',   icon: XCircle       },
        ].map(s => (
          <button key={s.label}
            onClick={() => setFilterEtat(filterEtat === s.label.split(' ')[1]?.toUpperCase() ? '' :
              s.color === 'green' ? 'OK' : s.color === 'amber' ? 'ALERTE' : s.color === 'red' ? 'RUPTURE' : '')}
            className={`bg-white rounded-2xl border-2 p-4 flex items-center gap-3 hover:shadow-md transition text-left
              ${filterEtat === (s.color === 'green' ? 'OK' : s.color === 'amber' ? 'ALERTE' : s.color === 'red' ? 'RUPTURE' : '')
                ? `border-${s.color}-400` : 'border-gray-200'}`}>
            <div className={`w-10 h-10 rounded-xl bg-${s.color}-100 flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 text-${s.color}-600`} />
            </div>
            <div>
              <p className="text-xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher article, référence, catégorie..." className="input pl-9" />
        </div>
        <select value={filterEtat} onChange={e => setFilterEtat(e.target.value)} className="input w-auto">
          <option value="">Tous les états</option>
          <option value="OK">OK</option>
          <option value="ALERTE">En alerte</option>
          <option value="RUPTURE">En rupture</option>
        </select>
        {filterEtat && (
          <button onClick={() => setFilterEtat('')}
            className="btn-secondary text-xs px-3">Réinitialiser</button>
        )}
      </div>

      {/* Tableau stock */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400">Aucun article trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Article','Référence','Catégorie','Localisation','Stock actuel','Stock min','État','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(a => {
                const etat = ETAT[a.etat_stock] || ETAT.OK
                return (
                  <tr key={a.id} className={`hover:bg-gray-50 transition
                    ${a.etat_stock === 'RUPTURE' ? 'bg-red-50/30' : ''}
                    ${a.etat_stock === 'ALERTE'  ? 'bg-amber-50/30' : ''}`}>

                    <td className="px-4 py-3 font-semibold text-gray-900">{a.designation}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{a.reference || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{a.categorie || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{a.localisation || '—'}</td>

                    {/* Stock actuel avec barre visuelle */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-black tabular-nums ${
                          a.etat_stock === 'RUPTURE' ? 'text-red-600' :
                          a.etat_stock === 'ALERTE'  ? 'text-amber-600' : 'text-green-700'
                        }`}>{a.stock_actuel}</span>
                        <span className="text-xs text-gray-400">{a.unite}</span>
                      </div>
                      {/* Barre de stock */}
                      {a.stock_minimum > 0 && (
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${
                            a.etat_stock === 'RUPTURE' ? 'bg-red-500' :
                            a.etat_stock === 'ALERTE'  ? 'bg-amber-500' : 'bg-green-500'
                          }`} style={{ width: `${Math.min(100, (a.stock_actuel / (a.stock_minimum * 3)) * 100)}%` }} />
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-gray-500 tabular-nums">
                      {a.stock_minimum} <span className="text-xs text-gray-400">{a.unite}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${etat.color}`}>
                        <etat.icon className="w-3 h-3" />
                        {etat.label}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {can('stock:move') && a.stock_actuel > 0 && (
                          <button onClick={() => openSortie(a)} title="Sortie stock"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition">
                            <ArrowUpCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => openHisto(a)} title="Historique mouvements"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition">
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal sortie */}
      <Modal open={!!sortieModal} onClose={() => setSortieModal(null)}
        title={`Sortie de stock — ${sortieModal?.designation}`} size="sm">
        {sortieModal && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
              <ArrowUpCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Stock disponible</p>
                <p className="text-xl font-black text-red-700">{sortieModal.stock_actuel} {sortieModal.unite}</p>
              </div>
            </div>
            <div>
              <label className="label">Quantité à sortir <span className="text-red-500">*</span></label>
              <input type="number" min="1" max={sortieModal.stock_actuel} step="0.01"
                value={sortieForm.quantite}
                onChange={e => setSortieForm(f => ({ ...f, quantite: e.target.value }))}
                className="input" />
            </div>
            <div>
              <label className="label">Service bénéficiaire <span className="text-red-500">*</span></label>
              <input type="text" value={sortieForm.service}
                onChange={e => setSortieForm(f => ({ ...f, service: e.target.value }))}
                className="input" placeholder="ex: Service RH, Direction..." />
            </div>
            <div>
              <label className="label">Observations</label>
              <input type="text" value={sortieForm.observations}
                onChange={e => setSortieForm(f => ({ ...f, observations: e.target.value }))}
                className="input" placeholder="Motif de la sortie..." />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setSortieModal(null)} className="btn-secondary">Annuler</button>
              <button onClick={handleSortie} className="btn-danger">
                <ArrowUpCircle className="w-4 h-4" /> Valider la sortie
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal historique */}
      <Modal open={!!histoModal} onClose={() => setHistoModal(null)}
        title={`Historique — ${histoModal?.designation}`} size="lg">
        {mouvements.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Aucun mouvement enregistré</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Date','Type','Quantité','Référence','Service','Par'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mouvements.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 text-xs">{formatDate(m.date)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      m.type === 'ENTREE'     ? 'bg-green-100 text-green-700' :
                      m.type === 'SORTIE'     ? 'bg-red-100 text-red-700'    :
                                                'bg-gray-100 text-gray-700'
                    }`}>
                      {m.type === 'ENTREE' ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                      {m.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-bold tabular-nums">
                    {m.type === 'ENTREE' ? '+' : '-'}{m.quantite}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-blue-600">{m.reference_doc || '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{m.service || '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{m.user_nom || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  )
}