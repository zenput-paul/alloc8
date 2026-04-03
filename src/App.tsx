import { useState } from 'react';
import {
  AppBar,
  Tabs,
  Tab,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import PieChartIcon from '@mui/icons-material/PieChart';
import CalculateIcon from '@mui/icons-material/Calculate';
import LanguageIcon from '@mui/icons-material/Language';
import { useTranslation } from 'react-i18next';
import { PortfolioView } from './components/portfolio/PortfolioView';
import { CalculatorView } from './components/calculator/CalculatorView';

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇲🇽' },
];

function App() {
  const [view, setView] = useState(0);
  const [langAnchor, setLangAnchor] = useState<HTMLElement | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t, i18n } = useTranslation();

  function handleLanguageChange(code: string) {
    i18n.changeLanguage(code);
    setLangAnchor(null);
  }

  return (
    <Box sx={{ pb: isMobile ? 7 : 0 }}>
      <AppBar position="static">
        <Toolbar variant="dense">
          <Typography variant="h6" sx={isMobile ? { flexGrow: 1 } : { mr: 2 }}>
            Alloc8
          </Typography>
          {!isMobile && (
            <Tabs
              value={view}
              onChange={(_, v) => setView(v)}
              textColor="inherit"
              sx={{ flexGrow: 1 }}
            >
              <Tab
                label={t('nav.portfolio')}
                icon={<PieChartIcon />}
                iconPosition="start"
              />
              <Tab
                label={t('nav.calculator')}
                icon={<CalculateIcon />}
                iconPosition="start"
              />
            </Tabs>
          )}
          <IconButton
            color="inherit"
            aria-label={t('nav.changeLanguage')}
            onClick={(e) => setLangAnchor(e.currentTarget)}
          >
            <LanguageIcon />
          </IconButton>
          <Menu
            anchorEl={langAnchor}
            open={!!langAnchor}
            onClose={() => setLangAnchor(null)}
          >
            {languages.map((lang) => (
              <MenuItem
                key={lang.code}
                selected={i18n.language.startsWith(lang.code)}
                onClick={() => handleLanguageChange(lang.code)}
              >
                {lang.flag} {lang.label}
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </AppBar>
      {view === 0 ? <PortfolioView /> : <CalculatorView />}
      {isMobile && (
        <Paper
          component="nav"
          aria-label={t('nav.mainNavigation')}
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}
          elevation={3}
        >
          <BottomNavigation
            value={view}
            onChange={(_, v) => setView(v)}
            showLabels
          >
            <BottomNavigationAction
              label={t('nav.portfolio')}
              icon={<PieChartIcon />}
            />
            <BottomNavigationAction
              label={t('nav.calculator')}
              icon={<CalculateIcon />}
            />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}

export default App;
