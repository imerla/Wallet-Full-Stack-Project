import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import TopUp from './pages/TopUp';
import Transfer from './pages/Transfer';
import Transactions from './pages/Transactions';
import PaymentWebhook from './pages/PaymentWebhook';
import Chat from './pages/Chat';
import MoneyRequest from './pages/MoneyRequest';
import MoneyRequestsList from './pages/MoneyRequestsList';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import Analytics from './pages/Analytics';
import Layout from './components/Layout';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="top-up" element={<TopUp />} />
                  <Route path="transfer" element={<Transfer />} />
                  <Route path="request-money" element={<MoneyRequest />} />
                  <Route path="money-requests" element={<MoneyRequestsList />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="chat" element={<Chat />} />
                </Route>
              </Route>
              <Route path="/admin" element={<AdminRoute />}>
                <Route element={<Layout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="support" element={<Chat />} />
                  <Route path="webhook" element={<PaymentWebhook />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
