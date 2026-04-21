

// ============================================================
// src/pages/Decharge/DechargeForm.jsx
// ============================================================
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ArrowLeft, ClipboardCheck, FileText } from 'lucide-react'
import { formatDate } from '@/utils/formatters'
import toast from 'react-hot-toast'

export default function DechargeForm() {
  const { brId }  = useParams()
  const navigate  = useNavigate()
  const user      = useAuthStore(s => s.user)

  const [brList, setBrList]   = useState([])
  const [selectedBR, setSelectedBR] = useState(null)
  const [brDetail, setBrDetail]     = useState(null)
  const [saving, setSaving]   = useState(false)

  const [form, setForm] = useState({
    br_id:               brId !== '0' ? brId : '',
    service_beneficiaire:'',
    num_facture:         '',
    date_facture:        '',
    observations:        '',
  })

  useEffect(() => {
    window.api.invoke('decharge:getBRSansDecharge').then(d => {
      setBrList(d ?? [])
      if (brId !== '0') handleBRChange(brId, d ?? [])
    })
  }, [])

  const handleBRChange = async (id, list = brList) => {
    const found = list.find(b => String(b.id) === String(id))
    setSelectedBR(found || null)
    setForm(f => ({ ...f, br_id: id }))
    if (!id) { setBrDetail(null); return }
    const detail = await window.api.invoke('br:getById', Number(id))
    setBrDetail(detail)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.br_id)                    { toast.error('Sélectionnez un bon de réception'); return }
    if (!form.service_beneficiaire.trim()) { toast.error('Service bénéficiaire requis'); return }
    if (!brDetail?.lignes?.length)      { toast.error('Aucune ligne dans ce BR'); return }

    setSaving(true)
    const res = await window.api.invoke('decharge:create', {
      bc_id:               brDetail.bc_id,
      br_id:               Number(form.br_id),
      service_beneficiaire:form.service_beneficiaire,
      chef_id:             user.id,
      num_facture:         form.num_facture || null,
      date_facture:        form.date_facture || null,
      observations:        form.observations || null,
      lignes: brDetail.lignes.map(l => ({
        article_id:   null,
        designation:  l.designation,
        quantite:     l.quantite_recue,
        observations: ''
      }))
    })
    setSaving(false)

    if (res.ok) {
      toast.success(`Décharge ${res.numero} créée — BC clôturé`)
      navigate('/decharges')
    } else toast.error(res.error)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/decharges')}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 transition text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouvelle Décharge</h1>
            <p className="text-sm text-gray-500">Attestation de remise au service bénéficiaire</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Sélection BR */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-blue-50">
            <FileText className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-blue-900 text-sm">Bon de Réception à décharger</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="label">Bon de Réception <span className="text-red-500">*</span></label>
              <select value={form.br_id} onChange={e => handleBRChange(e.target.value)} className="input">
                <option value="">— Sélectionner un BR —</option>
                {brList.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.numero} — {b.bc_numero} — {b.fournisseur_nom}
                  </option>
                ))}
              </select>
              {brList.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠ Aucun BR sans décharge disponible
                </p>
              )}
            </div>

            {/* Aperçu du BR sélectionné */}
            {brDetail && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-blue-400 font-semibold uppercase">BR</p>
                    <p className="font-bold text-blue-900">{brDetail.numero}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-400 font-semibold uppercase">BC lié</p>
                    <p className="font-bold text-blue-900">{brDetail.bc_numero}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-400 font-semibold uppercase">Fournisseur</p>
                    <p className="font-bold text-blue-900">{brDetail.fournisseur_nom}</p>
                  </div>
                </div>

                {/* Articles du BR */}
                <div className="border-t border-blue-200 pt-3">
                  <p className="text-xs font-semibold text-blue-600 mb-2">
                    Articles reçus ({brDetail.lignes?.length})
                  </p>
                  <div className="space-y-1">
                    {brDetail.lignes?.map(l => (
                      <div key={l.id} className="flex justify-between text-xs text-blue-800">
                        <span className="font-medium">{l.designation}</span>
                        <span className="font-bold">{l.quantite_recue} {l.unite}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Infos décharge */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-green-50">
            <ClipboardCheck className="w-4 h-4 text-green-600" />
            <h2 className="font-semibold text-green-900 text-sm">Informations de la décharge</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="label">Service bénéficiaire <span className="text-red-500">*</span></label>
              <input value={form.service_beneficiaire}
                onChange={e => set('service_beneficiaire', e.target.value)}
                className="input" placeholder="ex: Direction des Ressources Humaines" />
            </div>
            <div>
              <label className="label">N° Facture fournisseur</label>
              <input value={form.num_facture}
                onChange={e => set('num_facture', e.target.value)}
                className="input" placeholder="ex: FAC-2024-001" />
            </div>
            <div>
              <label className="label">Date facture</label>
              <input type="date" value={form.date_facture}
                onChange={e => set('date_facture', e.target.value)} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Observations</label>
              <textarea value={form.observations}
                onChange={e => set('observations', e.target.value)}
                rows={2} className="input resize-none"
                placeholder="Remarques, conditions de remise..." />
            </div>
          </div>
        </div>

        {/* Note info */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <ClipboardCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">À noter</p>
            <p className="text-xs mt-0.5">La création de cette décharge clôturera automatiquement le bon de commande associé.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate('/decharges')} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" /> Annuler
          </button>
          <button type="submit" disabled={saving || !brDetail}
            className="btn-primary px-8 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Création...</>
              : <><ClipboardCheck className="w-4 h-4" />Créer la décharge</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}