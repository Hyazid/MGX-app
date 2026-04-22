
// ============================================================
// src/pages/Reception/ReceptionForm.jsx
// ============================================================
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ArrowLeft, Truck, CheckCircle, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/utils/formatters'
import toast from 'react-hot-toast'

export default function ReceptionForm() {
  const { bcId }  = useParams()
  const navigate  = useNavigate()
  const user      = useAuthStore(s => s.user)

  const [bc, setBc]         = useState(null)
  const [lignes, setLignes] = useState([])
  const [observations, setObservations] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      window.api.invoke('bc:getById', Number(bcId)),
      window.api.invoke('br:getBCLignes', Number(bcId)),
    ]).then(([bcData, lignesData]) => {
      setBc(bcData)
      setLignes((lignesData ?? []).map(l => ({
        ...l,
        qte_a_recevoir: Math.max(0, l.quantite - (l.deja_recu || 0)),
        observations: ''
      })))
    })
  }, [bcId])

  const setQte = (id, val) =>
    setLignes(ls => ls.map(l => l.id === id ? { ...l, qte_a_recevoir: val } : l))

  const setObs = (id, val) =>
    setLignes(ls => ls.map(l => l.id === id ? { ...l, observations: val } : l))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const toReceive = lignes.filter(l => Number(l.qte_a_recevoir) > 0)
    if (!toReceive.length) { toast.error('Saisissez au moins une quantité reçue'); return }

    // Validation : pas plus que la quantité restante
    for (const l of toReceive) {
      const reste = l.quantite - (l.deja_recu || 0)
      if (Number(l.qte_a_recevoir) > reste) {
        toast.error(`Quantité trop élevée pour "${l.designation}" (max: ${reste})`)
        return
      }
    }

    setSaving(true)
    const res = await window.api.invoke('br:create', {
      bc_id:          Number(bcId),
      magasinier_id:  user.id,
      observations,
      lignes: toReceive.map(l => ({
        bc_ligne_id:     l.id,
        quantite_recue:  Number(l.qte_a_recevoir),
        observations:    l.observations
      }))
    })
    setSaving(false)

    if (res.ok) {
      toast.success(`Bon de réception ${res.numero} créé — stock mis à jour`)
      navigate('/receptions')
    } else {
      toast.error(res.error)
    }
  }

  if (!bc) return <div className="py-16 text-center text-gray-400">Chargement...</div>

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/receptions')}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 transition text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouvelle Réception</h1>
            <p className="text-sm text-gray-500">
              BC <span className="font-mono font-semibold text-blue-600">{bc.numero}</span>
              {' — '}{bc.fournisseur_nom}
            </p>
          </div>
        </div>
      </div>

      {/* Info BC */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-blue-400 uppercase font-semibold mb-0.5">Fournisseur</p>
          <p className="font-bold text-blue-900">{bc.fournisseur_nom}</p>
        </div>
        <div>
          <p className="text-xs text-blue-400 uppercase font-semibold mb-0.5">Date commande</p>
          <p className="font-medium text-blue-800">{formatDate(bc.date)}</p>
        </div>
        <div>
          <p className="text-xs text-blue-400 uppercase font-semibold mb-0.5">Délai prévu</p>
          <p className="font-medium text-blue-800">{formatDate(bc.delai_livraison) || '—'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Tableau de saisie */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-amber-50">
            <Truck className="w-4 h-4 text-amber-600" />
            <h2 className="font-semibold text-amber-900 text-sm">
              Saisie des quantités reçues
            </h2>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Désignation','Commandé','Déjà reçu','Reste','Qté reçue aujourd\'hui','Obs.'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lignes.map(l => {
                const reste = l.quantite - (l.deja_recu || 0)
                const isComplete = Number(l.qte_a_recevoir) >= reste
                const isEmpty    = Number(l.qte_a_recevoir) === 0
                return (
                  <tr key={l.id} className={`
                    transition
                    ${isComplete && !isEmpty ? 'bg-green-50' : ''}
                    ${isEmpty ? 'bg-gray-50 opacity-60' : ''}
                  `}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{l.designation}</td>
                    <td className="px-4 py-3 tabular-nums text-gray-600">
                      {l.quantite} <span className="text-xs text-gray-400">{l.unite}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {l.deja_recu > 0
                        ? <span className="text-amber-600 font-medium">{l.deja_recu}</span>
                        : <span className="text-gray-300">0</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {reste > 0
                        ? <span className="font-bold text-gray-900">{reste}</span>
                        : <span className="text-green-600 flex items-center gap-1 text-xs font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" /> Complet
                          </span>}
                    </td>
                    <td className="px-4 py-3">
                      {reste > 0 ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="0" max={reste} step="0.01"
                            value={l.qte_a_recevoir}
                            onChange={e => setQte(l.id, e.target.value)}
                            className="input w-24 text-center py-1.5 text-sm"
                          />
                          {Number(l.qte_a_recevoir) > 0 && Number(l.qte_a_recevoir) < reste && (
                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" title="Livraison partielle" />
                          )}
                          {isComplete && (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Déjà reçu</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {reste > 0 && (
                        <input
                          type="text"
                          value={l.observations}
                          onChange={e => setObs(l.id, e.target.value)}
                          placeholder="Remarque..."
                          className="input py-1.5 text-xs w-36"
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Résumé livraison */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
            {(() => {
              const total    = lignes.length
              const recus    = lignes.filter(l => Number(l.qte_a_recevoir) >= (l.quantite - (l.deja_recu||0)) && l.quantite > (l.deja_recu||0)).length
              const partiels = lignes.filter(l => Number(l.qte_a_recevoir) > 0 && Number(l.qte_a_recevoir) < (l.quantite - (l.deja_recu||0))).length
              return (
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                    {recus} ligne(s) complète(s)
                  </span>
                  {partiels > 0 && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="w-3 h-3" />
                      {partiels} ligne(s) partielle(s) → BC passera en "Livraison partielle"
                    </span>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Observations globales */}
        <div className="card p-5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Observations générales
          </label>
          <textarea value={observations} onChange={e => setObservations(e.target.value)}
            rows={2} className="input resize-none"
            placeholder="Remarques sur la livraison, état des colis, documents reçus..." />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate('/receptions')} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" /> Annuler
          </button>
          <button type="submit" disabled={saving} className="btn-primary px-8 py-2.5 bg-amber-600 hover:bg-amber-700">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enregistrement...</>
              : <><Truck className="w-4 h-4" />Valider la réception</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}