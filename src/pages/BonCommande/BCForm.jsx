import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Plus, Trash2, ArrowLeft, ShoppingCart, FileText, Building2, Calendar, Percent, ChevronDown } from 'lucide-react'
import { formatMontant, formatDate } from '@/utils/formatters'
import toast from 'react-hot-toast'

const UNITES = ['pcs','kg','l','m','m²','m³','boite','carton','rouleau','sac','lot']

const emptyLigne = () => ({
  _key: Date.now() + Math.random(),
  article_id: '', designation: '', quantite: 1, prix_unitaire: 0, unite: 'pcs'
})

// ── Composants internes ───────────────────────────────────────
function SectionCard({ icon: Icon, title, color = 'blue', children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-${color}-50`}>
        <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center`}>
          <Icon className={`w-4 h-4 text-${color}-600`} />
        </div>
        <h2 className={`font-semibold text-${color}-900 text-sm`}>{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label} {required && <span className="text-red-400 normal-case">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function BCForm() {
  const navigate  = useNavigate()
  const [params]  = useSearchParams()
  const user      = useAuthStore(s => s.user)

  const [fournisseurs, setFournisseurs] = useState([])
  const [articles, setArticles]         = useState([])
  const [bdaList, setBdaList]           = useState([])
  const [saving, setSaving]             = useState(false)
  const [selectedBda, setSelectedBda]   = useState(null)
  const [selectedFourn, setSelectedFourn] = useState(null)

  const [form, setForm] = useState({
    bda_id: params.get('bdaId') || '',
    fournisseur_id: '',
    delai_livraison: '',
    tva: 19,
    observations: '',
    lignes: [emptyLigne()]
  })

  useEffect(() => {
    Promise.all([
      window.api.invoke('fournisseurs:getAll'),
      window.api.invoke('articles:getAll'),
      window.api.invoke('bda:getValidedWithoutBC'),
    ]).then(([f, a, b]) => {
      setFournisseurs(f ?? [])
      setArticles(a ?? [])
      setBdaList(b ?? [])
      // Si bdaId en param, charge le BDA
      if (params.get('bdaId')) handleBdaChange(params.get('bdaId'), b ?? [])
    })
  }, [])

  const handleBdaChange = async (bdaId, list = bdaList) => {
    const found = list.find(b => String(b.id) === String(bdaId))
    setSelectedBda(found || null)
    setForm(f => ({ ...f, bda_id: bdaId, lignes: bdaId ? [] : [emptyLigne()] }))
    if (!bdaId) return
    const bda = await window.api.invoke('bda:getById', Number(bdaId))
    if (bda?.lignes?.length) {
      setForm(f => ({
        ...f, bda_id: bdaId,
        lignes: bda.lignes.map(l => ({
          _key: Date.now() + Math.random(),
          article_id:    l.article_id || '',
          designation:   l.article_designation || l.designation_libre || '',
          quantite:      l.quantite,
          prix_unitaire: 0,
          unite:         l.unite
        }))
      }))
    }
  }

  const handleFournChange = (id) => {
    const found = fournisseurs.find(f => String(f.id) === String(id))
    setSelectedFourn(found || null)
    setForm(f => ({ ...f, fournisseur_id: id }))
  }

  const setLigne = (key, field, val) =>
    setForm(f => ({ ...f, lignes: f.lignes.map(l => l._key === key ? { ...l, [field]: val } : l) }))

  const handleArticleSelect = (key, articleId) => {
    const art = articles.find(a => String(a.id) === String(articleId))
    setForm(f => ({
      ...f,
      lignes: f.lignes.map(l => l._key === key
        ? { ...l, article_id: articleId, designation: art?.designation || l.designation, unite: art?.unite || l.unite }
        : l)
    }))
  }

  const addLigne    = () => setForm(f => ({ ...f, lignes: [...f.lignes, emptyLigne()] }))
  const removeLigne = (key) => setForm(f => ({ ...f, lignes: f.lignes.filter(l => l._key !== key) }))

  const ht  = form.lignes.reduce((s, l) => s + (Number(l.quantite) * Number(l.prix_unitaire)), 0)
  const tvaAmt = ht * Number(form.tva) / 100
  const ttc = ht + tvaAmt

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fournisseur_id)     { toast.error('Sélectionnez un fournisseur'); return }
    if (!form.lignes.length)      { toast.error('Ajoutez au moins une ligne'); return }
    if (form.lignes.some(l => !l.designation.trim() || l.quantite <= 0))
      { toast.error('Vérifiez les lignes'); return }

    setSaving(true)
    const res = await window.api.invoke('bc:create', {
      ...form,
      chef_id: user.id,
      bda_id: form.bda_id ? Number(form.bda_id) : null,
      fournisseur_id: Number(form.fournisseur_id),
      lignes: form.lignes.map(l => ({
        article_id:    l.article_id ? Number(l.article_id) : null,
        designation:   l.designation,
        quantite:      Number(l.quantite),
        prix_unitaire: Number(l.prix_unitaire)
      }))
    })
    setSaving(false)
    if (res.ok) { toast.success(`BC ${res.numero} créé avec succès`); navigate('/bc') }
    else          toast.error(res.error)
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/bc')}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 transition text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nouveau Bon de Commande</h1>
              <p className="text-sm text-gray-500">Complétez les informations ci-dessous</p>
            </div>
          </div>
        </div>
        {/* Numéro auto preview */}
        <div className="hidden sm:block text-right">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Numéro</p>
          <p className="text-sm font-mono font-semibold text-gray-600">BC-{new Date().getFullYear()}-####</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Section 1 : BDA lié ─────────────────────── */}
        <SectionCard icon={FileText} title="Demande d'achat liée (optionnel)" color="purple">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="BDA validé">
              <select value={form.bda_id} onChange={e => handleBdaChange(e.target.value)} className="input">
                <option value="">— Sans BDA associé —</option>
                {bdaList.map(b => (
                  <option key={b.id} value={b.id}>{b.numero} — {b.service_demandeur}</option>
                ))}
              </select>
            </Field>
            {selectedBda && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">BDA sélectionné</p>
                <p className="text-sm font-bold text-purple-900">{selectedBda.numero}</p>
                <p className="text-xs text-purple-700">Service : {selectedBda.service_demandeur}</p>
                <p className="text-xs text-purple-600">
                  {form.lignes.length} ligne(s) importée(s) ✓
                </p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Section 2 : Fournisseur + Conditions ─────── */}
        <SectionCard icon={Building2} title="Fournisseur & Conditions" color="blue">
          <div className="grid grid-cols-2 gap-5">
            <Field label="Fournisseur" required>
              <select value={form.fournisseur_id} onChange={e => handleFournChange(e.target.value)} className="input">
                <option value="">— Sélectionner un fournisseur —</option>
                {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </Field>

            <Field label="TVA (%)">
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="number" min="0" max="100" step="1" value={form.tva}
                  onChange={e => setForm(f => ({ ...f, tva: e.target.value }))}
                  className="input pl-9 w-32" />
              </div>
            </Field>

            <Field label="Délai de livraison">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="date" value={form.delai_livraison}
                  onChange={e => setForm(f => ({ ...f, delai_livraison: e.target.value }))}
                  className="input pl-9" />
              </div>
            </Field>

            {selectedFourn && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Fournisseur</p>
                <p className="text-sm font-bold text-blue-900">{selectedFourn.nom}</p>
                {selectedFourn.telephone && <p className="text-xs text-blue-700">☎ {selectedFourn.telephone}</p>}
                {selectedFourn.nif       && <p className="text-xs text-blue-600">NIF : {selectedFourn.nif}</p>}
              </div>
            )}

            <div className="col-span-2">
              <Field label="Observations / Conditions de paiement">
                <textarea value={form.observations}
                  onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
                  rows={2} className="input resize-none"
                  placeholder="ex: Paiement à 30 jours, livraison en une seule fois..." />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* ── Section 3 : Lignes articles ──────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header section */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-green-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="font-semibold text-green-900 text-sm">
                Articles commandés
                <span className="ml-2 bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {form.lignes.length}
                </span>
              </h2>
            </div>
            <button type="button" onClick={addLigne}
              className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg transition">
              <Plus className="w-4 h-4" /> Ajouter une ligne
            </button>
          </div>

          <div className="p-4">
            {/* En-têtes */}
            <div className="grid gap-2 text-xs font-bold text-gray-400 uppercase tracking-wide px-3 mb-2"
              style={{ gridTemplateColumns: '2rem 1fr 1.4fr 5rem 5rem 7rem 6rem 2rem' }}>
              <div>#</div>
              <div>Catalogue</div>
              <div>Désignation</div>
              <div>Qté</div>
              <div>Unité</div>
              <div>Prix unitaire</div>
              <div className="text-right">Montant</div>
              <div></div>
            </div>

            {/* Lignes */}
            <div className="space-y-2">
              {form.lignes.map((ligne, idx) => {
                const montant = Number(ligne.quantite) * Number(ligne.prix_unitaire)
                const hasValue = montant > 0
                return (
                  <div key={ligne._key}
                    className="grid gap-2 items-center bg-gray-50 hover:bg-gray-100 transition rounded-xl px-3 py-2.5 group"
                    style={{ gridTemplateColumns: '2rem 1fr 1.4fr 5rem 5rem 7rem 6rem 2rem' }}>

                    {/* # */}
                    <span className="text-xs text-gray-400 font-mono font-bold">{idx + 1}</span>

                    {/* Article catalogue */}
                    <select value={ligne.article_id}
                      onChange={e => handleArticleSelect(ligne._key, e.target.value)}
                      className="input text-xs py-1.5 bg-white">
                      <option value="">Saisie libre</option>
                      {articles.map(a => <option key={a.id} value={a.id}>{a.designation}</option>)}
                    </select>

                    {/* Désignation */}
                    <input value={ligne.designation}
                      onChange={e => setLigne(ligne._key, 'designation', e.target.value)}
                      placeholder="Désignation de l'article..."
                      className="input text-xs py-1.5 bg-white" />

                    {/* Quantité */}
                    <input type="number" min="0.01" step="0.01" value={ligne.quantite}
                      onChange={e => setLigne(ligne._key, 'quantite', e.target.value)}
                      className="input text-xs py-1.5 bg-white text-center" />

                    {/* Unité */}
                    <select value={ligne.unite}
                      onChange={e => setLigne(ligne._key, 'unite', e.target.value)}
                      className="input text-xs py-1.5 bg-white">
                      {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>

                    {/* Prix unitaire */}
                    <div className="relative">
                      <input type="number" min="0" step="0.01" value={ligne.prix_unitaire}
                        onChange={e => setLigne(ligne._key, 'prix_unitaire', e.target.value)}
                        placeholder="0.00"
                        className="input text-xs py-1.5 bg-white pr-8 text-right" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">DA</span>
                    </div>

                    {/* Montant */}
                    <div className={`text-right text-xs font-bold px-1 ${hasValue ? 'text-gray-800' : 'text-gray-300'}`}>
                      {hasValue ? formatMontant(montant) : '—'}
                    </div>

                    {/* Supprimer */}
                    <button type="button" onClick={() => removeLigne(ligne._key)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 text-gray-400 hover:text-red-500 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>

            {form.lignes.length === 0 && (
              <div className="py-10 text-center">
                <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucune ligne — cliquez sur "Ajouter une ligne"</p>
              </div>
            )}
          </div>

          {/* ── Totaux ──────────────────────────────── */}
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Montant HT</span>
                  <span className="font-semibold tabular-nums">{formatMontant(ht)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>TVA ({form.tva}%)</span>
                  <span className="font-semibold tabular-nums">{formatMontant(tvaAmt)}</span>
                </div>
                <div className="h-px bg-gray-300" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total TTC</span>
                  <span className="text-xl font-black text-blue-700 tabular-nums">{formatMontant(ttc)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={() => navigate('/bc')} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" /> Annuler
          </button>
          <button type="submit" disabled={saving}
            className="btn-primary px-8 py-2.5 text-base disabled:opacity-60">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Création...</>
              : <><ShoppingCart className="w-4 h-4" /> Créer le bon de commande</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}