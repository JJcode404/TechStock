import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Pos } from './pages/Pos';
import { Products } from './pages/Products';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { Inventory } from './pages/Inventory';
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
        <Route path="purchase-orders" element={<Placeholder title="Purchase Orders" />} />
        <Route path="customers" element={<Placeholder title="Customers" />} />
        <Route path="suppliers" element={<Placeholder title="Suppliers" />} />
        <Route path="reports" element={<Placeholder title="Reports" />} />
        <Route path="expenses" element={<Placeholder title="Expenses" />} />
      </Route>
      <Route path="*" element={<Placeholder title="Page not found" />} />
    </Routes>
  );
}
