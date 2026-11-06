import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Coupons from './pages/Coupons.jsx';
import ApplyCoupon from './pages/ApplyCoupon.jsx';
import History from './pages/History.jsx';
import Analytics from './pages/Analytics.jsx';
import DsaImplementation from './pages/DsaImplementation.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

// HashRouter keeps every URL working after a browser refresh without server config.
export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/apply" element={<ApplyCoupon />} />
            <Route path="/history" element={<History />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/dsa" element={<DsaImplementation />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}
