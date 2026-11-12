import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import LocationModal from './components/LocationModal.jsx';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import Shop from './pages/Shop.jsx';
import Cart from './pages/Cart.jsx';
import Orders from './pages/Orders.jsx';
import Login from './pages/Login.jsx';
import ShopLogin from './pages/ShopLogin.jsx';
import ShopDashboard from './pages/ShopDashboard.jsx';

function RequireRole({ role, children }) {
  const { user } = useAuth();
  const here = useLocation();
  if (!user) return <Navigate to={role === 'shopkeeper' ? '/shop/login' : '/login'} state={{ from: here.pathname }} replace />;
  if (user.role !== role) return <Navigate to={user.role === 'shopkeeper' ? '/shop/dashboard' : '/'} replace />;
  return children;
}

/** Shopkeepers get their dashboard instead of the customer storefront. */
function CustomerArea({ children }) {
  const { user } = useAuth();
  if (user?.role === 'shopkeeper') return <Navigate to="/shop/dashboard" replace />;
  return children;
}

export default function App() {
  const here = useLocation();
  const bare = here.pathname === '/login' || here.pathname === '/shop/login';
  return (
    <div className="flex min-h-screen flex-col">
      {!bare && <Navbar />}
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<CustomerArea><Home /></CustomerArea>} />
          <Route path="/search" element={<CustomerArea><Search /></CustomerArea>} />
          <Route path="/shops/:id" element={<CustomerArea><Shop /></CustomerArea>} />
          <Route path="/cart" element={<CustomerArea><Cart /></CustomerArea>} />
          <Route path="/orders" element={<RequireRole role="customer"><Orders /></RequireRole>} />
          <Route path="/login" element={<Login />} />
          <Route path="/shop/login" element={<ShopLogin />} />
          <Route path="/shop/dashboard" element={<RequireRole role="shopkeeper"><ShopDashboard /></RequireRole>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!bare && <Footer />}
      <LocationModal />
    </div>
  );
}
