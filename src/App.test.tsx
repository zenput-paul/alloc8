import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from './i18n'
import App from './App'

// Mock child views to isolate App behavior
vi.mock('./components/portfolio/PortfolioView', () => ({
  PortfolioView: () => <div data-testid="portfolio-view">PortfolioView</div>,
}))
vi.mock('./components/calculator/CalculatorView', () => ({
  CalculatorView: () => <div data-testid="calculator-view">CalculatorView</div>,
}))

// Mock useMediaQuery to control mobile/desktop
let mockIsMobile = false
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material')
  return {
    ...actual,
    useMediaQuery: () => mockIsMobile,
  }
})

beforeEach(() => {
  mockIsMobile = false
  i18n.changeLanguage('en')
})

describe('App', () => {
  it('shows app name in the app bar', () => {
    render(<App />)

    expect(screen.getByText('Alloc8')).toBeInTheDocument()
  })

  it('shows Portfolio view by default', () => {
    render(<App />)

    expect(screen.getByTestId('portfolio-view')).toBeInTheDocument()
    expect(screen.queryByTestId('calculator-view')).not.toBeInTheDocument()
  })

  describe('desktop layout', () => {
    it('renders tabs for Portfolio and Calculator', () => {
      render(<App />)

      expect(screen.getByRole('tab', { name: /Portfolio/ })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Calculator/ })).toBeInTheDocument()
    })

    it('does not render bottom navigation', () => {
      render(<App />)

      expect(screen.queryByRole('button', { name: 'Portfolio' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Calculator' })).not.toBeInTheDocument()
    })

    it('switches to Calculator view when Calculator tab is clicked', async () => {
      const user = userEvent.setup()
      render(<App />)

      await user.click(screen.getByRole('tab', { name: /Calculator/ }))

      expect(screen.getByTestId('calculator-view')).toBeInTheDocument()
      expect(screen.queryByTestId('portfolio-view')).not.toBeInTheDocument()
    })
  })

  describe('mobile layout', () => {
    beforeEach(() => {
      mockIsMobile = true
    })

    it('renders bottom navigation with Portfolio and Calculator', () => {
      render(<App />)

      expect(screen.getByRole('button', { name: 'Portfolio' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Calculator' })).toBeInTheDocument()
    })

    it('does not render tabs', () => {
      render(<App />)

      expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    })

    it('switches to Calculator view when Calculator button is clicked', async () => {
      const user = userEvent.setup()
      render(<App />)

      await user.click(screen.getByRole('button', { name: 'Calculator' }))

      expect(screen.getByTestId('calculator-view')).toBeInTheDocument()
      expect(screen.queryByTestId('portfolio-view')).not.toBeInTheDocument()
    })
  })

  describe('language switcher', () => {
    it('opens language menu when globe icon is clicked', async () => {
      const user = userEvent.setup()
      render(<App />)

      await user.click(screen.getByRole('button', { name: 'Change language' }))

      expect(screen.getByRole('menuitem', { name: '🇺🇸 English' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: '🇲🇽 Español' })).toBeInTheDocument()
    })

    it('switches to Spanish when Español is selected', async () => {
      const user = userEvent.setup()
      render(<App />)

      await user.click(screen.getByRole('button', { name: 'Change language' }))
      await user.click(screen.getByRole('menuitem', { name: '🇲🇽 Español' }))

      // Nav labels should now be in Spanish
      expect(screen.getByRole('tab', { name: /Portafolio/ })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Calculadora/ })).toBeInTheDocument()
    })

    it('switches back to English after selecting Spanish', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Switch to Spanish
      await user.click(screen.getByRole('button', { name: 'Change language' }))
      await user.click(screen.getByRole('menuitem', { name: '🇲🇽 Español' }))

      // Switch back to English — aria-label is now in Spanish
      await user.click(screen.getByRole('button', { name: 'Cambiar idioma' }))
      await user.click(screen.getByRole('menuitem', { name: '🇺🇸 English' }))

      expect(screen.getByRole('tab', { name: /Portfolio/ })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Calculator/ })).toBeInTheDocument()
    })
  })
})
