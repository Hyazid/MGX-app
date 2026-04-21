import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { usePermission } from '@/hooks/usePermission'
import { getRoleLabel } from '@/utils/permissions'
import { formatMontant } from '@/utils/formatters'
import {
  FileText, ShoppingCart, Package, AlertTriangle,
  Truck, ClipboardCheck, TrendingUp, Plus,
  CheckCircle, Clock, XCircle, BarChart2,
  ArrowRight
} from 'lucide-react'

export default function Dashboard() {
  const navigate      = useNavigate()
  const user          = useAuthStore(s => s.user)
  const { can, role } = usePermission()

  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [bdaRecents, setBdaRecents] = useState([])
  const [bcRecents,  setBcRecents]  = useState([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      window.api.invoke('rapports:dashboard'),
      window.api.invoke('bda:getAll', { statut: 'SOUMIS' }),
      window.api.invoke('bc:getAll',  {}),
    ]).then(([s, bdas, bcs]) => {
      if (cancelled) return
      setStats(s)
      setBdaRecents((bdas ?? []).slice(0, 4))
      setBcRecents((bcs  ?? []).slice(0, 4))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // ── Cards selon le rôle ──────────────────────────────────
  const allCards = [
    {
      label: 'BDA en attente',
      value: stats.bda_soumis,
      icon:  FileText,
      color: 'blue',
      link:  '/bda',
      perm:  'bda:view',
      urgent: stats.bda_soumis > 0
    },
    {
      label: 'Commandes en cours',
      value: stats.bc_en_cours,
      icon:  ShoppingCart,
      color: 'amber',
      link:  '/bc',
      perm:  'bc:view'
    },
    {
      label: 'BC ce mois',
      value: stats.bc_ce_mois,
      icon:  TrendingUp,
      color: 'purple',
      link:  '/bc',
      perm:  'bc:view',
      sub:   formatMontant(stats.montant_mois)
    },
    {
      label: 'Alertes stock',
      value: stats.stock_alertes,
      icon:  AlertTriangle,
      color: 'red',
      link:  '/stock',
      perm:  'stock:view',
      urgent: stats.stock_alertes > 0
    },
    {
      label: 'Ruptures de stock',
      value: stats.stock_rupture,
      icon:  XCircle,
      color: 'red',
      link:  '/stock',
      perm:  'stock:view',
      urgent: stats.stock_rupture > 0
    },
    {
      label: 'Réceptions ce mois',
      value: stats.br_ce_mois,
      icon:  Truck,
      color: 'teal',
      link:  '/receptions',
      perm:  'br:view'
    },
    {
      label: 'Décharges ce mois',
      value: stats.decharges_mois,
      icon:  ClipboardCheck,
      color: 'green',
      link:  '/decharges',
      perm:  'decharge:view'
    },
    {
      label: 'Articles en stock',
      value: stats.total_articles,
      icon:  Package,
      color: 'gray',
      link:  '/articles',
      perm:  'articles:view'
    },
  ]

  const cards = allCards.filter(c => can(c.perm))

  const COLOR = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-700',   text: 'text-blue-700'   },
    amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-700', text: 'text-amber-700'  },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-700',text: 'text-purple-700'},
    red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-700',     text: 'text-red-700'    },
    teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-100 text-teal-700',   text: 'text-teal-700'   },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-700', text: 'text-green-700'  },
    gray:   { bg: 'bg-gray-50',   icon: 'bg-gray-100 text-gray-600',   text: 'text-gray-600'   },
  }

  return (
    <div className="space-y-6">

      {/* ── Greeting ─────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, {user?.prenom} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {getRoleLabel(role)} — {new Date().toLocaleDateString('fr-DZ', {
              weekday:'long', day:'numeric', month:'long', year:'numeric'
            })}
          </p>
        </div>
        {can('rapports:view') && (
          <button onClick={() => navigate('/rapports/stock')}
            className="btn-secondary text-sm">
            <BarChart2 className="w-4 h-4" /> Rapports
          </button>
        )}
      </div>

      {/* ── Alertes urgentes ─────────────────────────────── */}
      {(stats.bda_soumis > 0 || stats.stock_rupture > 0) && (
        <div className="space-y-2">
          {stats.bda_soumis > 0 && can('bda:validate') && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">
                    {stats.bda_soumis} demande{stats.bda_soumis > 1 ? 's' : ''} en attente de validation
                  </p>
                  <p className="text-xs text-blue-600">Action requise de votre part</p>
                </div>
              </div>
              <button onClick={() => navigate('/bda')}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900">
                Voir <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {stats.stock_rupture > 0 && can('stock:view') && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-5 py-3">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    {stats.stock_rupture} article{stats.stock_rupture > 1 ? 's' : ''} en rupture de stock
                  </p>
                  <p className="text-xs text-red-600">Commande urgente recommandée</p>
                </div>
              </div>
              <button onClick={() => navigate('/stock')}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-900">
                Voir <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Stats cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => {
          const cl = COLOR[c.color] || COLOR.gray
          return (
            <button key={c.label} onClick={() => navigate(c.link)}
              className={`relative bg-white rounded-2xl border-2 p-5 text-left hover:shadow-md transition
                ${c.urgent && c.value > 0 ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200 hover:border-blue-200'}`}>
              {c.urgent && c.value > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cl.icon}`}>
                  <c.icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
              </div>
              <p className={`text-3xl font-black tabular-nums ${c.urgent && c.value > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {c.value ?? 0}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
              {c.sub && <p className={`text-xs font-semibold mt-1 ${cl.text}`}>{c.sub}</p>}
            </button>
          )
        })}
      </div>

      {/* ── Contenu selon le rôle ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* BDA en attente (chef / agent) */}
        {can('bda:view') && (
          <Section
            title="Demandes d'achat récentes"
            icon={FileText}
            onMore={() => navigate('/bda')}
            action={can('bda:create') ? { label: 'Nouvelle demande', onClick: () => navigate('/bda/new') } : null}
          >
            {bdaRecents.length === 0 ? (
              <EmptyState icon={FileText} text="Aucune demande en cours" />
            ) : bdaRecents.map(b => (
              <ListRow key={b.id}
                onClick={() => navigate(`/bda/${b.id}`)}
                left={
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{b.numero}</p>
                    <p className="text-xs text-gray-500">{b.service_demandeur}</p>
                  </div>
                }
                right={
                  <StatutPill statut={b.statut} map={{
                    BROUILLON: { color: 'gray',  label: 'Brouillon' },
                    SOUMIS:    { color: 'blue',  label: 'En attente' },
                    VALIDE:    { color: 'green', label: 'Validé' },
                    REJETE:    { color: 'red',   label: 'Rejeté' },
                  }} />
                }
              />
            ))}
          </Section>
        )}

        {/* Bons de commande récents */}
        {can('bc:view') && (
          <Section
            title="Bons de commande récents"
            icon={ShoppingCart}
            onMore={() => navigate('/bc')}
            action={can('bc:create') ? { label: 'Nouveau BC', onClick: () => navigate('/bc/new') } : null}
          >
            {bcRecents.length === 0 ? (
              <EmptyState icon={ShoppingCart} text="Aucun bon de commande" />
            ) : bcRecents.map(bc => (
              <ListRow key={bc.id}
                onClick={() => navigate(`/bc/${bc.id}`)}
                left={
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{bc.numero}</p>
                    <p className="text-xs text-gray-500">{bc.fournisseur_nom}</p>
                  </div>
                }
                right={
                  <div className="text-right">
                    <StatutPill statut={bc.statut} map={{
                      CREE:                 { color: 'gray',   label: 'Créé' },
                      ENVOYE:               { color: 'blue',   label: 'Envoyé' },
                      LIVRAISON_PARTIELLE:  { color: 'amber',  label: 'Partiel' },
                      LIVRE:                { color: 'teal',   label: 'Livré' },
                      CLOTURE:              { color: 'green',  label: 'Clôturé' },
                    }} />
                    <p className="text-xs font-semibold text-gray-700 mt-1">
                      {formatMontant(bc.montant_ttc)}
                    </p>
                  </div>
                }
              />
            ))}
          </Section>
        )}

        {/* Actions rapides */}
        <Section title="Actions rapides" icon={Plus}>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {[
              { label: 'Nouvelle demande',   icon: FileText,      to: '/bda/new',         perm: 'bda:create',         color: 'purple' },
              { label: 'Nouveau BC',          icon: ShoppingCart,  to: '/bc/new',          perm: 'bc:create',          color: 'blue'   },
              { label: 'Nouvelle réception',  icon: Truck,         to: '/receptions',      perm: 'br:create',          color: 'amber'  },
              { label: 'Nouvelle décharge',   icon: ClipboardCheck,to: '/decharges/new/0', perm: 'decharge:create',    color: 'green'  },
              { label: 'Sortie de stock',     icon: Package,       to: '/stock',           perm: 'stock:move',         color: 'red'    },
              { label: 'Nouvel inventaire',   icon: BarChart2,     to: '/inventaire',      perm: 'inventaire:create',  color: 'indigo' },
            ].filter(a => can(a.perm)).map(a => {
              const cl = COLOR[a.color] || COLOR.gray
              return (
                <button key={a.label} onClick={() => navigate(a.to)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition text-left ${cl.bg}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cl.icon}`}>
                    <a.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 leading-tight">{a.label}</span>
                </button>
              )
            })}
          </div>
        </Section>

        {/* Stock alertes */}
        {can('stock:view') && stats.stock_alertes > 0 && (
          <Section
            title={`Alertes stock (${stats.stock_alertes})`}
            icon={AlertTriangle}
            onMore={() => navigate('/stock')}
          >
            <StockAlertes navigate={navigate} />
          </Section>
        )}
      </div>
    </div>
  )
}

// ── Sous-composants ───────────────────────────────────────────
function Section({ title, icon: Icon, children, onMore, action }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {action && (
            <button onClick={action.onClick}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition">
              <Plus className="w-3.5 h-3.5" /> {action.label}
            </button>
          )}
          {onMore && (
            <button onClick={onMore}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              Tout voir <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  )
}

function ListRow({ left, right, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition text-left">
      {left}
      {right}
    </button>
  )
}

function StatutPill({ statut, map }) {
  const s = map[statut] || { color: 'gray', label: statut }
  const colors = {
    gray:  'bg-gray-100 text-gray-600',
    blue:  'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red:   'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    teal:  'bg-teal-100 text-teal-700',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colors[s.color] || colors.gray}`}>
      {s.label}
    </span>
  )
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="py-8 text-center">
      <Icon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
      <p className="text-xs text-gray-400">{text}</p>
    </div>
  )
}

function StockAlertes({ navigate }) {
  const [alertes, setAlertes] = useState([])
  useEffect(() => {
    window.api.invoke('stock:getAlertes').then(d => setAlertes((d ?? []).slice(0, 5)))
  }, [])

  return alertes.map(a => (
    <ListRow key={a.id}
      onClick={() => navigate('/stock')}
      left={
        <div>
          <p className="text-sm font-semibold text-gray-900">{a.designation}</p>
          <p className="text-xs text-gray-500">{a.categorie || 'Sans catégorie'}</p>
        </div>
      }
      right={
        <div className="text-right">
          <p className={`text-sm font-black tabular-nums ${a.stock_actuel <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
            {a.stock_actuel} {a.unite}
          </p>
          <p className="text-xs text-gray-400">min: {a.stock_minimum}</p>
        </div>
      }
    />
  ))
}