import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Config entreprise ─────────────────────────────────────────
const ORG = {
  nom:     'ENTREPRISE / DIRECTION',
  service: 'Service des Moyens Généraux',
  adresse: 'Alger, Algérie',
  tel:     '',
}

const BLUE  = [30,  58, 138]   // #1e3a8a
const LIGHT = [239, 246, 255]  // #eff6ff
const GRAY  = [107, 114, 128]

// ── Helpers ───────────────────────────────────────────────────
function newDoc() {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
}

function fmtDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('fr-DZ', { day:'2-digit', month:'2-digit', year:'numeric' })
  } catch { return d }
}

function fmtNum(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-DZ', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(n) + ' DA'
}

// ── Header commun ────────────────────────────────────────────
function drawHeader(doc, { title, numero, date, subtitle }) {
  // Bandeau bleu
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, 210, 32, 'F')

  // Texte blanc
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text(ORG.nom, 14, 12)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(ORG.service, 14, 19)
  doc.text(ORG.adresse, 14, 24)

  // Titre document à droite
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 210 - 14, 12, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`N° : ${numero}`, 210 - 14, 18, { align: 'right' })
  doc.text(`Date : ${fmtDate(date)}`, 210 - 14, 23, { align: 'right' })

  // Reset couleur
  doc.setTextColor(0, 0, 0)

  if (subtitle) {
    doc.setFillColor(...LIGHT)
    doc.rect(0, 32, 210, 8, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...GRAY)
    doc.text(subtitle, 14, 37.5)
    doc.setTextColor(0, 0, 0)
    return 44
  }
  return 38
}

// ── Zone info 2 colonnes ──────────────────────────────────────
function drawInfoBox(doc, y, left, right) {
  const colW = 88
  let yL = y, yR = y

  // Gauche
  doc.setFillColor(...LIGHT)
  doc.roundedRect(10, y, colW, 28, 2, 2, 'F')
  left.forEach(([label, val], i) => {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRAY)
    doc.text(label.toUpperCase(), 14, y + 6 + i * 8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.text(String(val || '—'), 14, y + 10 + i * 8)
    yL = y + 10 + i * 8
  })

  // Droite
  doc.setFillColor(...LIGHT)
  doc.roundedRect(110, y, colW, 28, 2, 2, 'F')
  right.forEach(([label, val], i) => {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRAY)
    doc.text(label.toUpperCase(), 114, y + 6 + i * 8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.text(String(val || '—'), 114, y + 10 + i * 8)
    yR = y + 10 + i * 8
  })

  return Math.max(yL, yR) + 8
}

// ── Zone signatures ────────────────────────────────────────────
function drawSignatures(doc, y, labels) {
  const count = labels.length
  const w     = (210 - 28) / count
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  labels.forEach((lbl, i) => {
    const x = 14 + i * w
    doc.text(lbl, x + w / 2, y, { align: 'center' })
    // Cadre signature
    doc.setDrawColor(200, 200, 200)
    doc.rect(x, y + 3, w - 4, 18)
  })
  doc.setTextColor(0, 0, 0)
}

// ────────────────────────────────────────────────────────────────
// EXPORT : BDA
// ────────────────────────────────────────────────────────────────
export function printBDA(bda) {
  const doc  = newDoc()
  const hasUrgent = bda.lignes?.some(l => l.urgence)

  let y = drawHeader(doc, {
    title:    'BON DE DEMANDE D\'ACHAT',
    numero:   bda.numero,
    date:     bda.date,
    subtitle: hasUrgent ? '⚠  Demande contenant des articles URGENTS' : null
  })

  y = drawInfoBox(doc, y, [
    ['Service demandeur', bda.service_demandeur],
    ['Agent',             bda.agent_nom],
    ['Date',              fmtDate(bda.date)],
  ], [
    ['Statut',    bda.statut === 'VALIDE' ? 'VALIDÉ' : bda.statut],
    ['N° BDA',    bda.numero],
    ['Observations', bda.observations?.slice(0, 40) || '—'],
  ]) + 4

  autoTable(doc, {
    startY: y,
    head: [['#', 'Désignation', 'Quantité', 'Unité', 'Priorité']],
    body: bda.lignes?.map((l, i) => [
      String(i + 1).padStart(2, '0'),
      l.article_designation || l.designation_libre,
      l.quantite,
      l.unite,
      l.urgence ? '⚠ URGENT' : 'Normal'
    ]) ?? [],
    headStyles: { fillColor: BLUE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 24, halign: 'center' }
    },
    didDrawCell: (data) => {
      // Ligne urgente en rouge clair
      if (data.section === 'body') {
        const row = bda.lignes?.[data.row.index]
        if (row?.urgence && data.column.index === 4) {
          doc.setTextColor(200, 0, 0)
        }
      }
    }
  })

  const finalY = doc.lastAutoTable.finalY + 15
  drawSignatures(doc, finalY, [
    "L'agent demandeur",
    "Chef de service",
    "Visa Moyens Généraux"
  ])

  doc.save(`${bda.numero}.pdf`)
}

// ────────────────────────────────────────────────────────────────
// EXPORT : BC
// ────────────────────────────────────────────────────────────────
export function printBC(bc) {
  const doc = newDoc()

  let y = drawHeader(doc, {
    title:    'BON DE COMMANDE',
    numero:   bc.numero,
    date:     bc.date,
    subtitle: bc.bda_numero ? `Suite à la demande d'achat : ${bc.bda_numero}` : null
  })

  y = drawInfoBox(doc, y, [
    ['Fournisseur',    bc.fournisseur_nom],
    ['Adresse',        bc.fournisseur_adresse?.slice(0, 35)],
    ['Téléphone',      bc.fournisseur_tel],
  ], [
    ['N° commande',     bc.numero],
    ['Délai livraison', fmtDate(bc.delai_livraison)],
    ['Établi par',      bc.chef_nom],
  ]) + 4

  autoTable(doc, {
    startY: y,
    head: [['#', 'Désignation', 'Qté', 'P.U (DA)', 'Montant HT (DA)']],
    body: bc.lignes?.map((l, i) => [
      String(i + 1).padStart(2, '0'),
      l.designation,
      l.quantite,
      fmtNum(l.prix_unitaire),
      fmtNum(l.montant)
    ]) ?? [],
    headStyles: { fillColor: BLUE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 38, halign: 'right' },
    },
  })

  // Totaux
  const ty = doc.lastAutoTable.finalY + 4
  doc.setFillColor(...LIGHT)
  doc.rect(120, ty, 78, 28, 'F')
  doc.setFontSize(9)

  const rows = [
    ['Montant HT :',  fmtNum(bc.montant_ht)],
    [`TVA (${bc.tva}%) :`, fmtNum(bc.montant_ttc - bc.montant_ht)],
    ['Total TTC :', fmtNum(bc.montant_ttc)],
  ]
  rows.forEach(([lbl, val], i) => {
    const isLast = i === rows.length - 1
    if (isLast) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setDrawColor(...BLUE)
      doc.line(120, ty + 4 + i * 8, 198, ty + 4 + i * 8)
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
    }
    doc.text(lbl, 125, ty + 8 + i * 8)
    doc.text(val, 198, ty + 8 + i * 8, { align: 'right' })
  })

  if (bc.observations) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...GRAY)
    doc.text(`Observations : ${bc.observations}`, 14, ty + 8)
    doc.setTextColor(0, 0, 0)
  }

  const sigY = ty + 36
  drawSignatures(doc, sigY, ["Établi par", "Approuvé par", "Cachet fournisseur"])
  doc.save(`${bc.numero}.pdf`)
}

// ────────────────────────────────────────────────────────────────
// EXPORT : BR
// ────────────────────────────────────────────────────────────────
export function printBR(br) {
  const doc = newDoc()

  let y = drawHeader(doc, {
    title:  'BON DE RÉCEPTION',
    numero: br.numero,
    date:   br.date,
    subtitle: `Suite au bon de commande : ${br.bc_numero}`
  })

  y = drawInfoBox(doc, y, [
    ['Fournisseur',  br.fournisseur_nom],
    ['BC lié',       br.bc_numero],
    ['Magasinier',   br.magasinier_nom],
  ], [
    ['N° BR',     br.numero],
    ['Date',      fmtDate(br.date)],
    ['Statut',    br.statut === 'COMPLET' ? 'LIVRAISON COMPLÈTE' : 'LIVRAISON PARTIELLE'],
  ]) + 4

  autoTable(doc, {
    startY: y,
    head: [['#', 'Désignation', 'Qté commandée', 'Qté reçue', 'Écart', 'Obs.']],
    body: br.lignes?.map((l, i) => {
      const ecart = l.quantite_recue - l.qte_commandee
      return [
        String(i + 1).padStart(2, '0'),
        l.designation,
        `${l.qte_commandee} ${l.unite || ''}`,
        `${l.quantite_recue} ${l.unite || ''}`,
        ecart === 0 ? '✓' : ecart < 0 ? `−${Math.abs(ecart)}` : `+${ecart}`,
        l.observations || ''
      ]
    }) ?? [],
    headStyles: { fillColor: BLUE, fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
    }
  })

  const sigY = doc.lastAutoTable.finalY + 15
  drawSignatures(doc, sigY, ["Le magasinier", "Chef Moyens Généraux", "Représentant fournisseur"])
  doc.save(`${br.numero}.pdf`)
}

// ────────────────────────────────────────────────────────────────
// EXPORT : DÉCHARGE
// ────────────────────────────────────────────────────────────────
export function printDecharge(d) {
  const doc = newDoc()

  let y = drawHeader(doc, {
    title:    'DÉCHARGE',
    numero:   d.numero,
    date:     d.date,
    subtitle: `Remise au service : ${d.service_beneficiaire}`
  })

  y = drawInfoBox(doc, y, [
    ['Service bénéficiaire', d.service_beneficiaire],
    ['BC lié',               d.bc_numero],
    ['BR lié',               d.br_numero],
  ], [
    ['Fournisseur',   d.fournisseur_nom],
    ['N° Facture',    d.num_facture],
    ['Date facture',  fmtDate(d.date_facture)],
  ]) + 4

  // Texte attestation
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...GRAY)
  doc.text(
    `Je soussigné(e), responsable du ${d.service_beneficiaire}, certifie avoir reçu les articles ci-dessous`,
    14, y
  )
  doc.text(`en bon état, conformément au bon de réception n° ${d.br_numero}.`, 14, y + 5)
  doc.setTextColor(0, 0, 0)
  y += 12

  autoTable(doc, {
    startY: y,
    head: [['#', 'Désignation', 'Quantité', 'Unité', 'Observations']],
    body: d.lignes?.map((l, i) => [
      String(i + 1).padStart(2, '0'),
      l.designation,
      l.quantite,
      l.unite || '—',
      l.observations || ''
    ]) ?? [],
    headStyles: { fillColor: BLUE, fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
    }
  })

  if (d.observations) {
    const oy = doc.lastAutoTable.finalY + 4
    doc.setFillColor(255, 251, 235)
    doc.rect(14, oy, 182, 10, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(146, 64, 14)
    doc.text(`Observations : ${d.observations}`, 17, oy + 6.5)
    doc.setTextColor(0, 0, 0)
  }

  const sigY = doc.lastAutoTable.finalY + 20
  drawSignatures(doc, sigY, [
    "Chef Moyens Généraux",
    "Responsable service bénéficiaire",
    "Date & Cachet"
  ])

  doc.save(`${d.numero}.pdf`)
}