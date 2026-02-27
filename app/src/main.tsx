import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import Layout from './components/Layout';

import './styles.css';
import './styles/theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
<BrowserRouter>
  <App />
</BrowserRouter>