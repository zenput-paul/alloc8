import { useState } from 'react'
import {
  AppBar,
  Tabs,
  Tab,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Paper,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import PieChartIcon from '@mui/icons-material/PieChart'
import CalculateIcon from '@mui/icons-material/Calculate'
import { PortfolioView } from './components/portfolio/PortfolioView'
import { CalculatorView } from './components/calculator/CalculatorView'

function App() {
  const [view, setView] = useState(0)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const content = view === 0 ? <PortfolioView /> : <CalculatorView />

  if (isMobile) {
    return (
      <Box sx={{ pb: 7 }}>
        {content}
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
          <BottomNavigation value={view} onChange={(_, v) => setView(v)} showLabels>
            <BottomNavigationAction label="Portfolio" icon={<PieChartIcon />} />
            <BottomNavigationAction label="Calculator" icon={<CalculateIcon />} />
          </BottomNavigation>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ mr: 2 }}>
            Portfolio
          </Typography>
          <Tabs
            value={view}
            onChange={(_, v) => setView(v)}
            textColor="inherit"
            indicatorColor="secondary"
          >
            <Tab label="Portfolio" icon={<PieChartIcon />} iconPosition="start" />
            <Tab label="Calculator" icon={<CalculateIcon />} iconPosition="start" />
          </Tabs>
        </Toolbar>
      </AppBar>
      {content}
    </Box>
  )
}

export default App
