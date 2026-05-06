import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/master/Customers";
import Vehicles from "./pages/master/Vehicles";
import DesignMix from "./pages/master/DesignMix";
import NewDelivery from "./pages/delivery/NewDelivery";
import History from "./pages/delivery/History";
import DeliveryChallan from "./pages/print/DeliveryChallan";
import BatchReport from "./pages/print/BatchReport";
import WeighmentSlip from "./pages/print/WeighmentSlip";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/master/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
            <Route path="/master/vehicles" element={<PrivateRoute><Vehicles /></PrivateRoute>} />
            <Route path="/master/design-mix" element={<PrivateRoute><DesignMix /></PrivateRoute>} />
            <Route path="/delivery/new" element={<PrivateRoute><NewDelivery /></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
            <Route path="/delivery/:id/challan" element={<PrivateRoute><DeliveryChallan /></PrivateRoute>} />
            <Route path="/delivery/:id/batch-report" element={<PrivateRoute><BatchReport /></PrivateRoute>} />
            <Route path="/delivery/:id/weighment" element={<PrivateRoute><WeighmentSlip /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
