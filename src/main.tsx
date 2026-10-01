import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './app/App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/Toast';
import { initializeDatabase } from './db/database';
import './styles/index.css';

initializeDatabase().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><ToastProvider><HashRouter><App /></HashRouter></ToastProvider></ErrorBoundary></React.StrictMode>);
});
