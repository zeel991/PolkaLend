import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Markets from './pages/Markets';
import Borrow from './pages/Borrow';
import Liquidations from './pages/Liquidations';

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/borrow" element={<Borrow />} />
          <Route path="/liquidations" element={<Liquidations />} />
          <Route path="*" element={<Navigate to="/\" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;