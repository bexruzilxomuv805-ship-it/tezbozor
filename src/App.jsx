import { Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import BottomTabBar from "./components/BottomTabBar";
import SupportWidget from "./components/SupportWidget";
import InstallAppBanner from "./components/InstallAppBanner";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import Profile from "./pages/Profile";
import MyOrders from "./pages/MyOrders";
import OrderSuccess from "./pages/OrderSuccess";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminPromoCodes from "./pages/admin/AdminPromoCodes";
import AdminSettings from "./pages/admin/AdminSettings";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  return (
    <AppProvider>
      <div className="min-h-screen w-full flex flex-col" style={{ background: "var(--gc-cream)" }}>
        <Header />
        <InstallAppBanner />
        <main className="flex-1 pb-24 md:pb-28 lg:pb-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dokon" element={<Shop />} />
            <Route path="/mahsulot/:id" element={<ProductDetail />} />
            <Route path="/savat" element={<Cart />} />
            <Route path="/sevimlilar" element={<Wishlist />} />
            <Route path="/profil" element={<Profile />} />
            <Route path="/buyurtmalarim" element={<MyOrders />} />
            <Route path="/buyurtma-qabul-qilindi/:orderId" element={<OrderSuccess />} />

              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="mahsulotlar" element={<AdminProducts />} />
              <Route path="buyurtmalar" element={<AdminOrders />} />
              <Route path="foydalanuvchilar" element={<AdminUsers />} />
              <Route path="murojaatlar" element={<AdminSupport />} />
              <Route path="promo-kodlar" element={<AdminPromoCodes />} />
              <Route path="sozlamalar" element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        <BottomTabBar />
        <SupportWidget />
      </div>
    </AppProvider>
  );
}

export default App;
