import {
  createRoot
} from 'react-dom/client';

import App from './App';

import {
  DesktopApiProvider
} from './api';

import './styles.css';
import './api-v2.css';
import './dashboard-led-api-v2.css';
import './schedule-firmware-logs-api-v2.css';

createRoot(
  document.getElementById(
    'root'
  )!
).render(
  <DesktopApiProvider>
    <App />
  </DesktopApiProvider>
);
