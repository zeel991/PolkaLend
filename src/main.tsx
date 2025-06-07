import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import { WalletProvider } from './contexts/WalletContext';
import { LendingProvider } from './contexts/LendingContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <WalletProvider>
        <LendingProvider>
          <App />
        </LendingProvider>
      </WalletProvider>
    </Router>
  </StrictMode>
);