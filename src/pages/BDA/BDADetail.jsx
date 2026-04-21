import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import {
  ArrowLeft, CheckCircle, XCircle, ShoppingCart,
  Printer, FileText, User, Calendar, Building2,
  AlertTriangle, Clock, Hash
} from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/utils/formatters'
import { printBDA } from '@/utils/pdf'
import toast from 'react-hot-toast'

const S_COLOR = { BROUILLON:'gray', SOUMIS:'blue', VALIDE:'green', REJETE:'red' }
const S_LABEL = { BROUILLON:'Brouillon', SOUMIS:'Soumis', VALIDE:'Validé', REJETE:'Rejeté' }

const TIMELINE = [
  { key:'BROUILLON', label:'Brouillon',          icon: FileText    },
  { key:'SOUMIS',    label:'Soumis',              icon: Clock       },
  { key:'VALIDE',    label:'Validé',              icon: CheckCircle },
]

function StatusTimeline({ current }) {
  if (current === 'REJETE') {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <XCircle className="w-5 h-5 text-red-500" />
        <span className="text-sm font-semibold text-red-700">Demande rejetée</span>
      </div>
    )
  }
  const order = ['BROUILLON','SOUMIS','VALIDE']
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
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                active  ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-110' :
                done    ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                <s.icon className="w-4 h-4" />
              </div>
              <span className={`text-xs font-semibold ${
                active ? 'text-purple-600' : done ? 'text-green-600' : 'text-gray-400'
              }`}>{s.label}</span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 rounded ${done && i < idx ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function BDADetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { can }  = usePermission()
  const [bda, setBda]           = useState(null)
  const [loading, setLoading]   = useState(true)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectNote, setRejectNote]   = useState('')

  const load = async () => {
    setLoading(true)
    const data = await window.api.invoke('bda:getById', Number(id))
    setBda(data); setLoading(false)
  }
  useEffect(() => { load() }, [id])

  const handleValider = async () => {
    if (!confirm('Valider cette demande ?')) return
    const res = await window.api.invoke('bda:valider', Number(id))
    if (res.ok) { toast.success('BDA validé ✓'); load() }
    else          toast.error(res.error)
  }

  const handleRejeter = async () => {
    if (!rejectNote.trim()) { toast.error('Motif requis'); return }
    const res = await window.api.invoke('bda:rejeter', { id: Number(id), observations: rejectNote })
    if (res.ok) { toast.success('BDA rejeté'); setRejectModal(false); load() }
    else          toast.error(res.error)
  }

  const urgentCount = bda?.lignes?.filter(l => l.urgence).length ?? 0

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!bda) return <div className="py-16 text-center text-gray-400">BDA introuvable</div>

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-5">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/bda')}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 transition text-gray-500 flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-gray-900 font-mono">{bda.numero}</h1>
              <Badge color={S_COLOR[bda.statut]}>{S_LABEL[bda.statut]}</Badge>
              {urgentCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" /> {urgentCount} urgent{urgentCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Créé le {formatDate(bda.date)} par {bda.agent_nom || '—'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => printBDA(bda)} className="btn-secondary text-xs px-3 py-2">
            <Printer className="w-4 h-4" /> Imprimer
          </button>

          {can('bda:validate') && bda.statut === 'SOUMIS' && (
            <>
              <button onClick={() => setRejectModal(true)}
                className="btn-secondary text-xs px-3 py-2 border-red-200 text-red-600 hover:bg-red-50">
                <XCircle className="w-4 h-4" /> Rejeter
              </button>
              <button onClick={handleValider}
                className="btn-primary text-xs px-3 py-2 bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4" /> Valider
              </button>
            </>
          )}

          {can('bc:create') && bda.statut === 'VALIDE' && (
            <button onClick={() => navigate(`/bc/new?bdaId=${bda.id}`)}
              className="btn-primary text-xs px-3 py-2">
              <ShoppingCart className="w-4 h-4" /> Créer BC
            </button>
          )}

          {can('bda:edit') && bda.statut === 'BROUILLON' && (
            <button onClick={() => navigate(`/bda/${bda.id}/edit`)}
              className="btn-secondary text-xs px-3 py-2">
              Modifier
            </button>
          )}
        </div>
      </div>

      {/* ── Timeline ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Progression</p>
        <StatusTimeline current={bda.statut} />
        {bda.statut === 'REJETE' && bda.observations && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-red-600">Motif du rejet</p>
            <p className="text-sm text-red-800 mt-0.5">{bda.observations}</p>
          </div>
        )}
      </div>

      {/* ── Infos ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
            <Building2 className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Demande</span>
          </div>
          <div className="p-5 space-y-3">
            <InfoRow icon={Hash}     label="Numéro"  value={<span className="font-mono font-bold text-purple-600">{bda.numero}</span>} />
            <InfoRow icon={Calendar} label="Date"    value={formatDate(bda.date)} />
            <InfoRow icon={Building2}label="Service" value={<span className="font-semibold">{bda.service_demandeur}</span>} />
            <InfoRow icon={User}     label="Agent"   value={bda.agent_nom || '—'} />
          </div>
        </div>

        {bda.observations && bda.statut !== 'REJETE' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">Observations</p>
            <p className="text-sm text-amber-900">{bda.observations}</p>
          </div>
        )}
      </div>

      {/* ── Tableau lignes ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-800">Articles demandés</span>
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">
              {bda.lignes?.length}
            </span>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['#','Désignation','Quantité','Unité','Urgence'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bda.lignes?.map((l, i) => (
              <tr key={l.id}
                className={`transition ${l.urgence ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50'}`}>
                <td className="px-5 py-3.5 text-gray-300 font-mono text-xs">{String(i+1).padStart(2,'0')}</td>
                <td className="px-5 py-3.5 font-semibold text-gray-900">
                  {l.article_designation || l.designation_libre}
                </td>
                <td className="px-5 py-3.5 tabular-nums font-medium">{l.quantite}</td>
                <td className="px-5 py-3.5 text-gray-500">{l.unite}</td>
                <td className="px-5 py-3.5">
                  {l.urgence
                    ? <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                        <AlertTriangle className="w-3 h-3" /> Urgent
                      </span>
                    : <span className="text-xs text-gray-400">Normal</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Modal rejet ─────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Rejeter cette demande</h3>
                <p className="text-xs text-gray-500">Le motif sera visible par l'agent</p>
              </div>
            </div>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
              rows={3} className="input resize-none"
              placeholder="Expliquez le motif du rejet..." autoFocus />
            <div className="flex justify-end gap-3">
              <button onClick={() => setRejectModal(false)} className="btn-secondary">Annuler</button>
              <button onClick={handleRejeter} className="btn-danger">
                <XCircle className="w-4 h-4" /> Confirmer le rejet
              </button>
            </div>
          </div>
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
      <div className="flex-1 flex items-center justify-between">
        <span className="text-xs text-gray-400 w-16 flex-shrink-0">{label}</span>
        <span className="text-sm text-gray-800">{value}</span>
      </div>
    </div>
  )
}