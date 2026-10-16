import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import App from './App';
import '@habsum/ui/styles';
import '@habsum/habit-render/styles';
import './styles/main.scss';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ModalProvider>
        <App />
      </ModalProvider>
    </ToastProvider>
  </StrictMode>,
);
