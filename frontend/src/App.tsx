import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Pos } from './pages/Pos';
import { Products } from './pages/Products';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { Inventory } from './pages/Inventory';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { Suppliers } from './pages/Suppliers';
import { Reports } from './pages/Reports';
import { Expenses } from './pages/Expenses';
import { Customers } from './pages/Customers';
import { Placeholder } from './pages/Placeholder';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pos" element={<Pos />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="reports" element={<Reports />} />
        <Route path="expenses" element={<Expenses />} />
      </Route>
      <Route path="*" element={<Placeholder title="Page not found" />} />
    </Routes>
  );
}
