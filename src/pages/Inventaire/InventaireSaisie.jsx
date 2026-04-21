
// ============================================================
// src/pages/Inventaire/InventaireSaisie.jsx
// ============================================================
import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { usePermission } from '@/hooks/usePermission'
import {
  ArrowLeft, Save, CheckCircle, Search,
  AlertTriangle, TrendingUp, TrendingDown, Minus,
  ClipboardList
} from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/utils/formatters'
import toast from 'react-hot-toast'

export default function InventaireSaisie() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const user      = useAuthStore(s => s.user)
  const { can }   = usePermission()

  const [inv, setInv]       = useState(null)
  const [lignes, setLignes] = useState([])
  const [search, setSearch] = useState('')
  const [filterEcart, setFilterEcart] = useState('') // 'positif','negatif','zero'
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const data = await window.api.invoke('inventaire:getById', Number(id))
    if (!data) { navigate('/inventaire'); return }
    setInv(data)
    setLignes(data.lignes.map(l => ({
      ...l,
      stock_reel:   l.stock_reel ?? 0,
      observations: l.observations ?? '',
      dirty:        false
    })))
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  const setL = (articleId, field, val) =>
    setLignes(ls => ls.map(l =>
      l.article_id === articleId ? { ...l, [field]: val, dirty: true } : l
    ))

  // Stats temps réel
  const stats = useMemo(() => {
    const total    = lignes.length
    const saisis   = lignes.filter(l => l.dirty || l.stock_reel > 0).length
    const positifs = lignes.filter(l => (l.stock_reel - l.stock_theorique) > 0).length
    const negatifs = lignes.filter(l => (l.stock_reel - l.stock_theorique) < 0).length
    const zeros    = lignes.filter(l => (l.stock_reel - l.stock_theorique) === 0).length
    return { total, saisis, positifs, negatifs, zeros }
  }, [lignes])

  const filtered = lignes
    .filter(l => {
      if (!filterEcart) return true
      const e = l.stock_reel - l.stock_theorique
      if (filterEcart === 'positif') return e > 0
      if (filterEcart === 'negatif') return e < 0
      if (filterEcart === 'zero')    return e === 0
      return true
    })
    .filter(l =>
      l.designation.toLowerCase().includes(search.toLowerCase()) ||
      (l.categorie  ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (l.reference  ?? '').toLowerCase().includes(search.toLowerCase())
    )

  const handleSave = async () => {
    setSaving(true)
    const res = await window.api.invoke('inventaire:saveLignes', {
      inventaire_id: Number(id),
      lignes: lignes.map(l => ({
        article_id:   l.article_id,
        stock_reel:   Number(l.stock_reel),
        observations: l.observations
      }))
    })
    setSaving(false)
    if (res.ok) toast.success('Saisie sauvegardée')
    else          toast.error(res.error)
  }

  const handleValider = async () => {
    const hasEcarts = lignes.some(l => (l.stock_reel - l.stock_theorique) !== 0)
    const msg = hasEcarts
      ? `Valider l'inventaire ? ${stats.positifs + stats.negatifs} écart(s) seront appliqués au stock.`
      : "Valider l'inventaire ? Aucun écart détecté."
    if (!confirm(msg)) return

    setSaving(true)
    // Sauvegarder d'abord
    await window.api.invoke('inventaire:saveLignes', {
      inventaire_id: Number(id),
      lignes: lignes.map(l => ({ article_id: l.article_id, stock_reel: Number(l.stock_reel), observations: l.observations }))
    })
    // Puis valider
    const res = await window.api.invoke('inventaire:valider', { inventaire_id: Number(id), user_id: user.id })
    setSaving(false)
    if (res.ok) {
      toast.success('Inventaire validé — stock mis à jour ✓')
      navigate('/inventaire')
    } else toast.error(res.error)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const isReadonly = inv?.statut !== 'EN_COURS'

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/inventaire')}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 transition text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">
                  Inventaire du {formatDate(inv?.date_debut)}
                </h1>
                <Badge color={inv?.statut === 'EN_COURS' ? 'blue' : inv?.statut === 'VALIDE' ? 'green' : 'red'}>
                  {inv?.statut === 'EN_COURS' ? 'En cours' : inv?.statut === 'VALIDE' ? 'Validé' : 'Annulé'}
                </Badge>
              </div>
              <p className="text-xs text-gray-500">{stats.saisis}/{stats.total} articles saisis</p>
            </div>
          </div>
        </div>

        {!isReadonly && (
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-secondary text-xs px-3 py-2">
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            {can('inventaire:validate') && (
              <button onClick={handleValider} disabled={saving}
                className="btn-primary text-xs px-3 py-2 bg-indigo-600 hover:bg-indigo-700">
                <CheckCircle className="w-4 h-4" /> Valider & Appliquer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:'Total articles', value:stats.total,    color:'blue',  icon:ClipboardList },
          { label:'Sans écart',     value:stats.zeros,    color:'green', icon:Minus         },
          { label:'Excédents',      value:stats.positifs, color:'teal',  icon:TrendingUp    },
          { label:'Manquants',      value:stats.negatifs, color:'red',   icon:TrendingDown  },
        ].map(s => (
          <button key={s.label}
            onClick={() => setFilterEcart(
              s.color === 'green' ? (filterEcart === 'zero' ? '' : 'zero') :
              s.color === 'teal'  ? (filterEcart === 'positif' ? '' : 'positif') :
              s.color === 'red'   ? (filterEcart === 'negatif' ? '' : 'negatif') : ''
            )}
            className={`bg-white rounded-2xl border-2 p-4 flex items-center gap-3 hover:shadow-md transition text-left
              ${filterEcart === (s.color === 'green' ? 'zero' : s.color === 'teal' ? 'positif' : s.color === 'red' ? 'negatif' : '')
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

      {/* Barre progression */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Progression de la saisie</span>
          <span className="font-bold">{stats.saisis}/{stats.total}</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 rounded-full transition-all"
            style={{ width: `${stats.total ? (stats.saisis / stats.total) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Filtres */}
      <div className="card p-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher article, catégorie, référence..." className="input pl-9" />
        </div>
        {filterEcart && (
          <button onClick={() => setFilterEcart('')} className="btn-secondary text-xs px-3">
            Effacer filtre
          </button>
        )}
      </div>

      {/* Tableau saisie */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Article','Réf.','Catégorie','Unité','Stock théorique','Stock réel','Écart','Observations'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(l => {
              const ecart = Number(l.stock_reel) - Number(l.stock_theorique)
              const hasEcart = ecart !== 0
              return (
                <tr key={l.article_id}
                  className={`transition ${
                    ecart > 0 ? 'bg-teal-50/30' :
                    ecart < 0 ? 'bg-red-50/30'  : ''
                  }`}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{l.designation}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{l.reference || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{l.categorie || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{l.unite}</td>
                  <td className="px-4 py-3 tabular-nums font-medium text-gray-700">{l.stock_theorique}</td>

                  {/* Saisie stock réel */}
                  <td className="px-4 py-3">
                    {isReadonly ? (
                      <span className="font-bold tabular-nums">{l.stock_reel}</span>
                    ) : (
                      <input
                        type="number" min="0" step="0.01"
                        value={l.stock_reel}
                        onChange={e => setL(l.article_id, 'stock_reel', e.target.value)}
                        className={`input w-24 text-center py-1.5 text-sm font-bold
                          ${ecart > 0 ? 'border-teal-300 focus:ring-teal-400' :
                            ecart < 0 ? 'border-red-300 focus:ring-red-400' : ''}`}
                      />
                    )}
                  </td>

                  {/* Écart */}
                  <td className="px-4 py-3">
                    {hasEcart ? (
                      <span className={`inline-flex items-center gap-1 text-sm font-black tabular-nums
                        ${ecart > 0 ? 'text-teal-600' : 'text-red-600'}`}>
                        {ecart > 0
                          ? <TrendingUp className="w-4 h-4" />
                          : <TrendingDown className="w-4 h-4" />}
                        {ecart > 0 ? '+' : ''}{ecart}
                      </span>
                    ) : (
                      <span className="text-green-500 flex items-center gap-1 text-xs font-semibold">
                        <Minus className="w-3.5 h-3.5" /> 0
                      </span>
                    )}
                  </td>

                  {/* Observation */}
                  <td className="px-4 py-3">
                    {isReadonly ? (
                      <span className="text-xs text-gray-500">{l.observations || '—'}</span>
                    ) : (
                      <input type="text" value={l.observations}
                        onChange={e => setL(l.article_id, 'observations', e.target.value)}
                        placeholder={hasEcart ? 'Expliquer l\'écart...' : ''}
                        className={`input py-1.5 text-xs w-40 ${hasEcart ? 'border-amber-300' : ''}`}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">Aucun article trouvé</div>
        )}
      </div>

      {/* Alerte validation */}
      {!isReadonly && (stats.positifs + stats.negatifs) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">
              {stats.positifs + stats.negatifs} écart(s) détecté(s)
            </p>
            <p className="text-xs mt-0.5">
              {stats.negatifs > 0 && `${stats.negatifs} article(s) en manque · `}
              {stats.positifs > 0 && `${stats.positifs} article(s) en excédent`}
              {' — '}En validant, le stock sera ajusté automatiquement.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}