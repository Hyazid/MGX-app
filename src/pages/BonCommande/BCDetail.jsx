import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import {
  ArrowLeft, Printer, Truck, CheckCircle, Send,
  Building2, Calendar, FileText, User, Package,
  ShoppingCart, Hash, Clock, XSquare
} from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatDate, formatMontant } from '@/utils/formatters'
import { printBC } from '@/utils/pdf'   // ✅ FIX 1 : import manquant
import toast from 'react-hot-toast'

const S_COLOR = { CREE:'gray', ENVOYE:'blue', LIVRAISON_PARTIELLE:'amber', LIVRE:'teal', CLOTURE:'green' }
const S_LABEL = { CREE:'Créé', ENVOYE:'Envoyé', LIVRAISON_PARTIELLE:'Livraison partielle', LIVRE:'Livré', CLOTURE:'Clôturé' }

const TIMELINE = [
  { key: 'CREE',                label: 'Créé',               icon: FileText    },
  { key: 'ENVOYE',              label: 'Envoyé fournisseur', icon: Send        },
  { key: 'LIVRAISON_PARTIELLE', label: 'Livraison partielle',icon: Truck       },
  { key: 'LIVRE',               label: 'Livré',              icon: CheckCircle },
  { key: 'CLOTURE',             label: 'Clôturé',            icon: CheckCircle },
]

function StatusTimeline({ current }) {
  const order = ['CREE','ENVOYE','LIVRAISON_PARTIELLE','LIVRE','CLOTURE']
  const idx   = order.indexOf(current)
  return (
    <div className="flex items-center">
      {TIMELINE.map((s, i) => {
        const done   = i <= idx
        const active = i === idx
        const isLast = i === TIMELINE.length - 1
        return (
          <div key={s.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110' :
                done   ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                <s.icon className="w-3.5 h-3.5" />
              </div>
              <span className={`text-xs font-medium text-center leading-tight whitespace-nowrap ${
                active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'
              }`}>{s.label}</span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 rounded ${done && i < idx ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function BCDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { can }  = usePermission()
  const [bc, setBc]           = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const data = await window.api.invoke('bc:getById', Number(id))
    setBc(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  const setStatut = async (statut, label) => {
    if (!confirm(`Confirmer : ${label} ?`)) return
    const res = await window.api.invoke('bc:setStatut', { id: Number(id), statut })
    if (res.ok) { toast.success(`Statut mis à jour → ${label}`); load() }
    else          toast.error(res.error)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!bc) return <div className="py-16 text-center text-gray-400">BC introuvable</div>

  return (
    <div className="max-w-5xl mx-auto pb-10 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/bc')}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 transition text-gray-500 flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-gray-900 font-mono">{bc.numero}</h1>
              <Badge color={S_COLOR[bc.statut]}>{S_LABEL[bc.statut]}</Badge>
              {bc.bda_numero && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  ← {bc.bda_numero}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Créé le {formatDate(bc.date)} par {bc.chef_nom}
            </p>
          </div>
        </div>

        {/* ✅ FIX 2 : workflow complet CREE→ENVOYE→LIVRE→CLOTURE */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">

          {/* Imprimer — FIX 1 : printBC maintenant importé */}
          <button onClick={() => printBC(bc)} className="btn-secondary text-xs px-3 py-2">
            <Printer className="w-4 h-4" /> Imprimer PDF
          </button>

          {/* CREE → ENVOYE */}
          {can('bc:edit') && bc.statut === 'CREE' && (
            <button onClick={() => setStatut('ENVOYE', 'Marquer comme envoyé')}
              className="btn-primary text-xs px-3 py-2 bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4" /> Marquer envoyé
            </button>
          )}

          {/* ENVOYE → créer réception OU marquer livré directement */}
          {can('br:create') && (bc.statut === 'ENVOYE' || bc.statut === 'LIVRAISON_PARTIELLE') && (
            <button onClick={() => navigate(`/receptions/new/${bc.id}`)}
              className="btn-primary text-xs px-3 py-2 bg-amber-600 hover:bg-amber-700">
              <Truck className="w-4 h-4" /> Créer réception
            </button>
          )}

          {/* ENVOYE → LIVRE (sans BR, livraison directe) */}
          {can('bc:edit') && bc.statut === 'ENVOYE' && (
            <button onClick={() => setStatut('LIVRE', 'Marquer comme livré')}
              className="btn-primary text-xs px-3 py-2 bg-teal-600 hover:bg-teal-700">
              <CheckCircle className="w-4 h-4" /> Marquer livré
            </button>
          )}

          {/* LIVRE → CLOTURE  ✅ FIX 2 : étape manquante */}
          {can('bc:edit') && bc.statut === 'LIVRE' && (
            <button onClick={() => setStatut('CLOTURE', 'Clôturer ce bon de commande')}
              className="btn-primary text-xs px-3 py-2 bg-green-600 hover:bg-green-700">
              <XSquare className="w-4 h-4" /> Clôturer
            </button>
          )}

          {/* LIVRAISON_PARTIELLE → LIVRE */}
          {can('bc:edit') && bc.statut === 'LIVRAISON_PARTIELLE' && (
            <button onClick={() => setStatut('LIVRE', 'Marquer comme entièrement livré')}
              className="btn-primary text-xs px-3 py-2 bg-teal-600 hover:bg-teal-700">
              <CheckCircle className="w-4 h-4" /> Marquer livré
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Progression</p>
        <StatusTimeline current={bc.statut} />
      </div>

      {/* Infos 2 colonnes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
            <ShoppingCart className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Détails commande</span>
          </div>
          <div className="p-5 space-y-3">
            <InfoRow icon={Hash}      label="Numéro"     value={<span className="font-mono font-bold text-blue-600">{bc.numero}</span>} />
            <InfoRow icon={Calendar}  label="Date"       value={formatDate(bc.date)} />
            <InfoRow icon={Clock}     label="Délai livr."value={formatDate(bc.delai_livraison) || '—'} />
            <InfoRow icon={FileText}  label="BDA lié"    value={bc.bda_numero ? <span className="text-purple-600 font-medium">{bc.bda_numero}</span> : '—'} />
            {bc.service_demandeur && <InfoRow icon={User} label="Service" value={bc.service_demandeur} />}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
            <Building2 className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fournisseur</span>
          </div>
          <div className="p-5">
            <p className="text-lg font-bold text-gray-900 mb-3">{bc.fournisseur_nom}</p>
            <div className="space-y-2 text-sm text-gray-600">
              {bc.fournisseur_adresse && <p className="flex items-start gap-2"><span className="text-gray-400 text-xs w-14">Adresse</span>{bc.fournisseur_adresse}</p>}
              {bc.fournisseur_tel     && <p className="flex items-center gap-2"><span className="text-gray-400 text-xs w-14">Tél</span>{bc.fournisseur_tel}</p>}
              <p className="flex items-center gap-2"><span className="text-gray-400 text-xs w-14">Établi par</span><span className="font-medium">{bc.chef_nom}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau articles */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-800">Articles commandés</span>
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">{bc.lignes?.length}</span>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['#','Désignation','Quantité','Unité','Prix unitaire','Montant HT'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bc.lignes?.map((l, i) => (
              <tr key={l.id} className="hover:bg-blue-50/30 transition">
                <td className="px-5 py-3.5 text-gray-300 font-mono text-xs">{String(i+1).padStart(2,'0')}</td>
                <td className="px-5 py-3.5 font-semibold text-gray-900">{l.designation}</td>
                <td className="px-5 py-3.5 tabular-nums font-medium">{l.quantite}</td>
                <td className="px-5 py-3.5 text-gray-500">{l.article_unite || '—'}</td>
                <td className="px-5 py-3.5 tabular-nums text-gray-600">{formatMontant(l.prix_unitaire)}</td>
                <td className="px-5 py-3.5 tabular-nums font-bold text-gray-900">{formatMontant(l.montant)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-5 bg-gray-50 border-t border-gray-100">
          <div className="flex justify-end">
            <div className="w-80 space-y-2.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Montant HT</span>
                <span className="font-semibold tabular-nums">{formatMontant(bc.montant_ht)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>TVA ({bc.tva}%)</span>
                <span className="font-semibold tabular-nums">{formatMontant(bc.montant_ttc - bc.montant_ht)}</span>
              </div>
              <div className="h-px bg-gray-300" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900 text-base">Total TTC</span>
                <span className="text-2xl font-black text-blue-700 tabular-nums">{formatMontant(bc.montant_ttc)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {bc.observations && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1.5">Observations</p>
          <p className="text-sm text-amber-900">{bc.observations}</p>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-gray-500" />
      </div>
      <div className="flex-1 flex items-center justify-between min-w-0">
        <span className="text-xs text-gray-400 w-20 flex-shrink-0">{label}</span>
        <span className="text-sm text-gray-800 font-medium text-right">{value}</span>
      </div>
    </div>
  )
}