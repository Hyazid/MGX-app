import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import AppLayout from '@/layouts/AppLayout'
import Login from '@/pages/Login'

// Pages — importe seulement ce qui existe
import Dashboard      from '@/pages/Dashboard'
import BDAList        from '@/pages/BDA/BDAList'
import BDAForm        from '@/pages/BDA/BDAForm'
import BDADetail      from '@/pages/BDA/BDADetail'
import BCList         from '@/pages/BonCommande/BCList'
import BCForm         from '@/pages/BonCommande/BCForm'
import BCDetail       from '@/pages/BonCommande/BCDetail'
import ReceptionList  from '@/pages/Reception/ReceptionList'
import ReceptionForm  from '@/pages/Reception/ReceptionForm'
import DechargeList   from '@/pages/Decharge/DechargeList'
import DechargeForm   from '@/pages/Decharge/DechargeForm'
import StockList      from '@/pages/Stock/StockList'
import ArticleList    from '@/pages/Articles/ArticleList'
import RapportStock        from '@/pages/Rapports/RapportStock'
import FournisseurList    from '@/pages/Fournisseurs/FournisseurList'
import InventaireList     from '@/pages/Inventaire/InventaireList'
import InventaireSaisie   from '@/pages/Inventaire/InventaireSaisie'
import UsersManagement   from '@/pages/Admin/UsersManagement'

// Placeholder pour pages pas encore implémentées
const Soon = ({ name }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <p className="text-4xl mb-3">🚧</p>
      <p className="text-xl font-semibold text-gray-700">{name}</p>
      <p className="text-sm text-gray-400 mt-1">En cours de développement</p>
    </div>
  </div>
)

function RequireAuth({ children }) {
  const ok = useAuthStore(s => s.isAuthenticated)
  return ok ? children : <Navigate to="/login" replace />
}

function GuestOnly({ children }) {
  const ok = useAuthStore(s => s.isAuthenticated)
  return !ok ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <HashRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <Routes>
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />

        <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"              element={<Dashboard />} />

          {/* BDA */}
          <Route path="bda"                    element={<BDAList />} />
          <Route path="bda/new"                element={<BDAForm />} />
          <Route path="bda/:id"                element={<BDADetail />} />
          <Route path="bda/:id/edit"           element={<BDAForm />} />

          {/* BC */}
          <Route path="bc"                     element={<BCList />} />
          <Route path="bc/new"                 element={<BCForm />} />
          <Route path="bc/:id"                 element={<BCDetail />} />
          <Route path="bc/:id/edit"            element={<BCForm />} />

          {/* Réceptions */}
          <Route path="receptions"             element={<ReceptionList />} />
          <Route path="receptions/new/:bcId"   element={<ReceptionForm />} />

          {/* Décharges */}
          <Route path="decharges"              element={<DechargeList />} />
          <Route path="decharges/new/:brId"    element={<DechargeForm />} />
          <Route path="decharges/:id"          element={<DechargeList />} />

          {/* Réceptions — route détail */}
          <Route path="receptions/:id"         element={<ReceptionList />} />

          {/* Stock */}
          <Route path="stock"                  element={<StockList />} />

          {/* Articles */}
          <Route path="articles"               element={<ArticleList />} />

          {/* Fournisseurs */}
          <Route path="fournisseurs"           element={<FournisseurList />} />
          <Route path="fournisseurs/new"       element={<FournisseurList />} />

          {/* Inventaire */}
          <Route path="inventaire"             element={<InventaireList />} />
          <Route path="inventaire/:id"         element={<InventaireSaisie />} />

          {/* Rapports */}
          <Route path="rapports/stock"         element={<RapportStock />} />

          {/* Admin */}
          <Route path="admin/users"            element={<UsersManagement />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  )
}