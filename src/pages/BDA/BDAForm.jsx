import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  ArrowLeft, Plus, Trash2, Save, Send,
  FileText, Building2, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'

const UNITES   = ['pcs','kg','l','m','m²','m³','boite','carton','rouleau','sac','lot']
const SERVICES = [
  'Direction Générale','Ressources Humaines','Comptabilité & Finance',
  'Informatique','Logistique','Maintenance','Sécurité','Juridique','Communication'
]

const emptyLigne = () => ({
  _key: Date.now() + Math.random(),
  article_id: '', designation_libre: '',
  quantite: 1, unite: 'pcs', urgence: false
})

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function BDAForm() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const user     = useAuthStore(s => s.user)
  const isEdit   = Boolean(id)

  const [articles, setArticles] = useState([])
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({
    service_demandeur: '',
    observations: '',
    lignes: [emptyLigne()]
  })

  useEffect(() => {
    window.api.invoke('articles:getAll').then(a => setArticles(a ?? []))
    if (isEdit) {
      window.api.invoke('bda:getById', Number(id)).then(bda => {
        if (!bda) return
        setForm({
          service_demandeur: bda.service_demandeur,
          observations:      bda.observations || '',
          lignes: bda.lignes.map(l => ({
            _key:             l.id,
            article_id:       l.article_id || '',
            designation_libre:l.designation_libre || '',
            quantite:         l.quantite,
            unite:            l.unite,
            urgence:          Boolean(l.urgence)
          }))
        })
      })
    }
  }, [id])

  const setL = (key, field, val) =>
    setForm(f => ({ ...f, lignes: f.lignes.map(l => l._key === key ? { ...l, [field]: val } : l) }))

  const handleArticleSelect = (key, articleId) => {
    const art = articles.find(a => String(a.id) === String(articleId))
    setForm(f => ({
      ...f,
      lignes: f.lignes.map(l => l._key === key
        ? { ...l, article_id: articleId, designation_libre: art?.designation || '', unite: art?.unite || l.unite }
        : l)
    }))
  }

  const addLigne    = () => setForm(f => ({ ...f, lignes: [...f.lignes, emptyLigne()] }))
  const removeLigne = key => setForm(f => ({ ...f, lignes: f.lignes.filter(l => l._key !== key) }))

  const validate = () => {
    if (!form.service_demandeur.trim()) { toast.error('Service demandeur requis'); return false }
    if (!form.lignes.length)            { toast.error('Ajoutez au moins un article'); return false }
    const bad = form.lignes.some(l => !l.article_id && !l.designation_libre.trim())
    if (bad) { toast.error('Chaque ligne doit avoir une désignation'); return false }
    return true
  }

  const save = async (andSubmit = false) => {
    if (!validate()) return
    setSaving(true)

    const payload = {
      service_demandeur: form.service_demandeur,
      observations:      form.observations,
      agent_id:          user.id,
      lignes:            form.lignes.map(l => ({
        article_id:       l.article_id ? Number(l.article_id) : null,
        designation_libre:l.designation_libre || null,
        quantite:         Number(l.quantite),
        unite:            l.unite,
        urgence:          l.urgence
      }))
    }

    let res
    if (isEdit) res = await window.api.invoke('bda:update', { id: Number(id), ...payload })
    else        res = await window.api.invoke('bda:create', payload)

    if (!res.ok) { toast.error(res.error); setSaving(false); return }

    if (andSubmit) {
      const bdaId = isEdit ? Number(id) : res.id
      const r2 = await window.api.invoke('bda:soumettre', bdaId)
      if (!r2.ok) { toast.error(r2.error); setSaving(false); return }
      toast.success('BDA soumis pour validation ✓')
    } else {
      toast.success(isEdit ? 'BDA modifié' : 'Brouillon sauvegardé')
    }

    setSaving(false)
    navigate('/bda')
  }

  const urgentCount = form.lignes.filter(l => l.urgence).length

  return (
    <div className="max-w-5xl mx-auto pb-10">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/bda')}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 transition text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Modifier la demande' : 'Nouvelle demande d\'achat'}
            </h1>
            <p className="text-sm text-gray-500">
              {isEdit ? 'Modification du brouillon' : 'Remplissez et soumettez au chef'}
            </p>
          </div>
        </div>
        {urgentCount > 0 && (
          <div className="flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1.5 rounded-xl text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" />
            {urgentCount} urgent{urgentCount > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="space-y-5">

        {/* ── Section 1 : Infos générales ─────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-purple-50">
            <Building2 className="w-4 h-4 text-purple-600" />
            <h2 className="font-semibold text-purple-900 text-sm">Informations générales</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <Field label="Service demandeur" required>
                <div className="flex gap-2">
                  <select
                    value={SERVICES.includes(form.service_demandeur) ? form.service_demandeur : '__custom'}
                    onChange={e => {
                      if (e.target.value !== '__custom')
                        setForm(f => ({ ...f, service_demandeur: e.target.value }))
                    }}
                    className="input w-64 flex-shrink-0"
                  >
                    <option value="__custom">— Saisie libre —</option>
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input
                    value={form.service_demandeur}
                    onChange={e => setForm(f => ({ ...f, service_demandeur: e.target.value }))}
                    className="input flex-1"
                    placeholder="Nom du service..."
                  />
                </div>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Observations / Justification">
                <textarea
                  value={form.observations}
                  onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
                  rows={2} className="input resize-none"
                  placeholder="Justification de la demande, contexte..."
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Section 2 : Lignes articles ─────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-blue-50">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-blue-900 text-sm">
                Articles demandés
                <span className="ml-2 bg-blue-200 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {form.lignes.length}
                </span>
              </h2>
            </div>
            <button type="button" onClick={addLigne}
              className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition">
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>

          <div className="p-4">
            {/* En-têtes */}
            <div className="grid gap-2 text-xs font-bold text-gray-400 uppercase tracking-wide px-3 mb-2"
              style={{ gridTemplateColumns: '2rem 1fr 1.5fr 5rem 5rem 5rem 2rem' }}>
              <div>#</div>
              <div>Catalogue</div>
              <div>Désignation</div>
              <div>Quantité</div>
              <div>Unité</div>
              <div>Urgence</div>
              <div></div>
            </div>

            <div className="space-y-2">
              {form.lignes.map((l, idx) => (
                <div key={l._key}
                  className={`grid gap-2 items-center rounded-xl px-3 py-2.5 group transition
                    ${l.urgence ? 'bg-red-50 border border-red-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                  style={{ gridTemplateColumns: '2rem 1fr 1.5fr 5rem 5rem 5rem 2rem' }}>

                  <span className={`text-xs font-mono font-bold ${l.urgence ? 'text-red-400' : 'text-gray-400'}`}>
                    {idx + 1}
                  </span>

                  {/* Catalogue */}
                  <select value={l.article_id}
                    onChange={e => handleArticleSelect(l._key, e.target.value)}
                    className="input text-xs py-1.5 bg-white">
                    <option value="">Saisie libre</option>
                    {articles.map(a => <option key={a.id} value={a.id}>{a.designation}</option>)}
                  </select>

                  {/* Désignation libre */}
                  <input value={l.designation_libre}
                    onChange={e => setL(l._key, 'designation_libre', e.target.value)}
                    placeholder={l.article_id ? 'Auto-rempli' : 'Désignation...'}
                    disabled={Boolean(l.article_id)}
                    className={`input text-xs py-1.5 ${l.article_id ? 'bg-gray-100 text-gray-500' : 'bg-white'}`}
                  />

                  {/* Quantité */}
                  <input type="number" min="0.01" step="0.01" value={l.quantite}
                    onChange={e => setL(l._key, 'quantite', e.target.value)}
                    className="input text-xs py-1.5 bg-white text-center" />

                  {/* Unité */}
                  <select value={l.unite}
                    onChange={e => setL(l._key, 'unite', e.target.value)}
                    className="input text-xs py-1.5 bg-white">
                    {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>

                  {/* Urgence toggle */}
                  <button type="button"
                    onClick={() => setL(l._key, 'urgence', !l.urgence)}
                    className={`flex items-center justify-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg transition
                      ${l.urgence
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'bg-white border border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500'}`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {l.urgence ? 'Urgent' : 'Normal'}
                  </button>

                  {/* Supprimer */}
                  <button type="button" onClick={() => removeLigne(l._key)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 text-gray-400 hover:text-red-500 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {form.lignes.length === 0 && (
              <div className="py-10 text-center">
                <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucune ligne — cliquez sur "Ajouter"</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate('/bda')} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" /> Annuler
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={() => save(false)} disabled={saving}
              className="btn-secondary">
              <Save className="w-4 h-4" />
              {isEdit ? 'Enregistrer' : 'Sauvegarder brouillon'}
            </button>
            <button type="button" onClick={() => save(true)} disabled={saving}
              className="btn-primary px-6 bg-purple-600 hover:bg-purple-700">
              {saving
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send className="w-4 h-4" />}
              Soumettre pour validation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}