import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Config from './pages/Config';
import Stats from './pages/Stats';
import Logs from './pages/Logs';
import AgentSelectionPage from './pages/AgentSelectionPage';

function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<Chat />} />
        <Route path="chat/:agentId" element={<Chat />} />
        <Route path="agents" element={<AgentSelectionPage />} />
        <Route path="config/:agentId" element={<Config />} />
        <Route path="stats" element={<Stats />} />
        <Route path="logs" element={<Logs />} />
      </Route>
    </Routes>
  );
}

export default App;
