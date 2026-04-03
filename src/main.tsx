import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';
import { DatabaseProvider } from './db/DatabaseProvider';
import './i18n';
import App from './App.tsx';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2E7D32',
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DatabaseProvider>
        <App />
      </DatabaseProvider>
    </ThemeProvider>
  </StrictMode>,
);
