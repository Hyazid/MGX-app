import { useEffect, useState, useMemo } from 'react'
import {
  Package, TrendingDown, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, Search, Download, Filter
} from 'lucide-react'
import { formatMontant, formatDate } from '@/utils/formatters'
import * as XLSX from 'xlsx'

const ETAT_CFG = {
  OK:      { label: 'OK',       color: 'bg-green-100 text-green-700', icon: CheckCircle  },
  ALERTE:  { label: 'Alerte',   color: 'bg-amber-100 text-amber-700', icon: AlertTriangle},
  RUPTURE: { label: 'Rupture',  color: 'bg-red-100   text-red-700',   icon: XCircle      },
}

const TABS = [
  { key: 'stock',       label: 'État du stock',      icon: Package     },
  { key: 'commandes',   label: 'Commandes / période', icon: TrendingUp  },
  { key: 'fournisseurs',label: 'Par fournisseur',     icon: TrendingDown},
]

export default function RapportStock() {
  const [tab,     setTab]     = useState('stock')
  const [stock,   setStock]   = useState([])
  const [cmds,    setCmds]    = useState([])
  const [fourns,  setFourns]  = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filterEtat, setFilterEtat] = useState('')

  const today   = new Date().toISOString().slice(0, 10)
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  const [dateDebut, setDateDebut] = useState(firstDay)
  const [dateFin,   setDateFin]   = useState(today)

  useEffect(() => {
    window.api.invoke('rapports:stock').then(d => {
      setStock(d ?? [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (tab === 'commandes') {
      window.api.invoke('rapports:commandes', { date_debut: dateDebut, date_fin: dateFin })
        .then(d => setCmds(d ?? []))
    }
    if (tab === 'fournisseurs') {
      window.api.invoke('rapports:parFournisseur', { date_debut: dateDebut, date_fin: dateFin })
        .then(d => setFourns(d ?? []))
    }
  }, [tab, dateDebut, dateFin])

  // ── Stats globales stock ──────────────────────────────────
  const statsStock = useMemo(() => ({
    total:   stock.length,
    ok:      stock.filter(a => a.etat_stock === 'OK').length,
    alerte:  stock.filter(a => a.etat_stock === 'ALERTE').length,
    rupture: stock.filter(a => a.etat_stock === 'RUPTURE').length,
    totalEntrees: stock.reduce((s, a) => s + (a.total_entrees || 0), 0),
    totalSorties: stock.reduce((s, a) => s + (a.total_sorties || 0), 0),
  }), [stock])

  const statsCmd = useMemo(() => ({
    total:   cmds.length,
    montant: cmds.reduce((s, c) => s + (c.montant_ttc || 0), 0),
    livres:  cmds.filter(c => c.statut === 'LIVRE' || c.statut === 'CLOTURE').length,
  }), [cmds])

  // ── Filtres stock ─────────────────────────────────────────
  const filteredStock = stock
    .filter(a => !filterEtat || a.etat_stock === filterEtat)
    .filter(a =>
      a.designation.toLowerCase().includes(search.toLowerCase()) ||
      (a.reference ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (a.categorie  ?? '').toLowerCase().includes(search.toLowerCase())
    )

  // ── Export Excel ─────────────────────────────────────────
  const exportExcel = () => {
    const data = filteredStock.map(a => ({
      'Désignation':     a.designation,
      'Référence':       a.reference || '',
      'Catégorie':       a.categorie || '',
      'Unité':           a.unite,
      'Stock actuel':    a.stock_actuel,
      'Stock minimum':   a.stock_minimum,
      'État':            ETAT_CFG[a.etat_stock]?.label || '',
      'Total entrées':   a.total_entrees || 0,
      'Total sorties':   a.total_sorties || 0,
      'Localisation':    a.localisation || '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Stock')
    XLSX.writeFile(wb, `rapport_stock_${today}.xlsx`)
  }

  const exportCmdsExcel = () => {
    const data = cmds.map(c => ({
      'Numéro':        c.numero,
      'Date':          formatDate(c.date),
      'Fournisseur':   c.fournisseur_nom,
      'Statut':        c.statut,
      'Montant HT':    c.montant_ht,
      'TVA':           c.tva,
      'Montant TTC':   c.montant_ttc,
      'Nb articles':   c.nb_lignes,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Commandes')
    XLSX.writeFile(wb, `rapport_commandes_${dateDebut}_${dateFin}.xlsx`)
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
          <p className="text-sm text-gray-500">Analyse et suivi de l'activité</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition
              ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB : État du stock ─────────────────────────── */}
      {tab === 'stock' && (
        <div className="space-y-4">
          {/* KPI */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label:'Total',     value:statsStock.total,   color:'gray'  },
              { label:'OK',        value:statsStock.ok,      color:'green' },
              { label:'Alertes',   value:statsStock.alerte,  color:'amber' },
              { label:'Ruptures',  value:statsStock.rupture, color:'red'   },
              { label:'Entrées',   value:statsStock.totalEntrees, color:'teal'  },
              { label:'Sorties',   value:statsStock.totalSorties, color:'purple'},
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                <p className={`text-2xl font-black tabular-nums text-${k.color}-600`}>{k.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Filtres + export */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..." className="input pl-9" />
            </div>
            <select value={filterEtat} onChange={e => setFilterEtat(e.target.value)}
              className="input w-auto">
              <option value="">Tous les états</option>
              <option value="OK">OK</option>
              <option value="ALERTE">Alerte</option>
              <option value="RUPTURE">Rupture</option>
            </select>
            <button onClick={exportExcel}
              className="btn-secondary text-xs px-3">
              <Download className="w-4 h-4" /> Excel
            </button>
          </div>

          {/* Tableau */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-gray-400">Chargement...</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Article','Réf.','Catégorie','Unité','Stock actuel','Stock min','Entrées','Sorties','Localisation','État'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStock.map(a => {
                    const ec = ETAT_CFG[a.etat_stock] || ETAT_CFG.OK
                    return (
                      <tr key={a.id} className={`transition
                        ${a.etat_stock==='RUPTURE' ? 'bg-red-50/30' :
                          a.etat_stock==='ALERTE'  ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-4 py-3 font-semibold text-gray-900 max-w-xs truncate">{a.designation}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{a.reference||'—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{a.categorie||'—'}</td>
                        <td className="px-4 py-3 text-gray-500">{a.unite}</td>
                        <td className="px-4 py-3 tabular-nums">
                          <span className={`text-base font-black ${
                            a.etat_stock==='RUPTURE' ? 'text-red-600' :
                            a.etat_stock==='ALERTE'  ? 'text-amber-600' : 'text-green-700'
                          }`}>{a.stock_actuel}</span>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-gray-500">{a.stock_minimum}</td>
                        <td className="px-4 py-3 tabular-nums text-teal-600 font-semibold">+{a.total_entrees||0}</td>
                        <td className="px-4 py-3 tabular-nums text-red-500 font-semibold">-{a.total_sorties||0}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{a.localisation||'—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ec.color}`}>
                            <ec.icon className="w-3 h-3" /> {ec.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            {/* Footer total */}
            {filteredStock.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
                <span>{filteredStock.length} article(s) affiché(s)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB : Commandes ─────────────────────────────── */}
      {tab === 'commandes' && (
        <div className="space-y-4">
          {/* Période + export */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4 items-center flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Du</label>
              <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                className="input w-36 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Au</label>
              <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
                className="input w-36 text-sm" />
            </div>
            <button onClick={exportCmdsExcel} className="btn-secondary text-xs px-3 ml-auto">
              <Download className="w-4 h-4" /> Excel
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label:'Total commandes',    value: statsCmd.total,           color:'blue'  },
              { label:'Montant TTC',        value: formatMontant(statsCmd.montant), color:'green', big:true },
              { label:'Livrées / Clôturées',value: `${statsCmd.livres} / ${statsCmd.total}`, color:'teal' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className={`${k.big ? 'text-xl' : 'text-3xl'} font-black text-${k.color}-600 tabular-nums`}>{k.value}</p>
                <p className="text-xs text-gray-400 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Numéro','Date','Fournisseur','Articles','Montant HT','TVA','Montant TTC','Statut'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cmds.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600">{c.numero}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(c.date)}</td>
                    <td className="px-4 py-3 font-medium max-w-xs truncate">{c.fournisseur_nom}</td>
                    <td className="px-4 py-3 tabular-nums text-center">{c.nb_lignes}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMontant(c.montant_ht)}</td>
                    <td className="px-4 py-3 tabular-nums text-gray-500">{c.tva}%</td>
                    <td className="px-4 py-3 tabular-nums font-bold">{formatMontant(c.montant_ttc)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        c.statut==='CLOTURE' ? 'bg-green-100 text-green-700' :
                        c.statut==='LIVRE'   ? 'bg-teal-100 text-teal-700'  :
                        c.statut==='ENVOYE'  ? 'bg-blue-100 text-blue-700'  :
                                               'bg-gray-100 text-gray-600'
                      }`}>{c.statut}</span>
                    </td>
                  </tr>
                ))}
                {cmds.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">Aucune commande sur cette période</td></tr>
                )}
              </tbody>
              {cmds.length > 0 && (
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-xs font-bold text-gray-500 text-right">TOTAL TTC :</td>
                    <td className="px-4 py-3 font-black text-blue-700 tabular-nums text-base">
                      {formatMontant(statsCmd.montant)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── TAB : Par fournisseur ───────────────────────── */}
      {tab === 'fournisseurs' && (
        <div className="space-y-4">
          {/* Période */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4 items-center flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Du</label>
              <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                className="input w-36 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Au</label>
              <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
                className="input w-36 text-sm" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['#','Fournisseur','Nb commandes','Montant HT','Montant TTC','Dernière commande'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fourns.map((f, i) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{f.nom}</td>
                    <td className="px-4 py-3 tabular-nums text-center font-bold">{f.nb_commandes}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMontant(f.total_ht)}</td>
                    <td className="px-4 py-3 tabular-nums font-bold text-blue-700">{formatMontant(f.total_ttc)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(f.derniere_commande)}</td>
                  </tr>
                ))}
                {fourns.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">Aucune donnée sur cette période</td></tr>
                )}
              </tbody>
              {fourns.length > 0 && (
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-xs font-bold text-gray-500 text-right">TOTAL GÉNÉRAL :</td>
                    <td className="px-4 py-3 font-black text-blue-700 tabular-nums text-base">
                      {formatMontant(fourns.reduce((s, f) => s + f.total_ttc, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}