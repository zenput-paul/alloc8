import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CalculatorView } from './CalculatorView'
import type { Group, Asset, AssetAllocation } from '../../types'

const mockCalc = {
  groups: [] as Group[],
  assets: [] as Asset[],
  isFetching: false,
  hasData: false,
  percentagesValid: true,
  allGroupsHaveActiveAssets: true,
  isValid: false,
  assetInputs: {},
  totalInvestment: '',
  result: null as null | { allocations: AssetAllocation[]; remainder: number },
  groupStats: new Map(),
  error: null as string | null,
  emptyAllocations: [] as AssetAllocation[],
  displayAllocations: [] as AssetAllocation[],
  displayRemainder: 0,
  handleAssetInputChange: vi.fn(),
  handleTotalInvestmentChange: vi.fn(),
  handleCalculate: vi.fn(),
  handleReset: vi.fn(),
}

vi.mock('./useCalculator', () => ({
  useCalculator: () => mockCalc,
}))

function resetMock() {
  mockCalc.groups = []
  mockCalc.assets = []
  mockCalc.isFetching = false
  mockCalc.hasData = false
  mockCalc.percentagesValid = true
  mockCalc.allGroupsHaveActiveAssets = true
  mockCalc.isValid = false
  mockCalc.assetInputs = {}
  mockCalc.totalInvestment = ''
  mockCalc.result = null
  mockCalc.groupStats = new Map()
  mockCalc.error = null
  mockCalc.emptyAllocations = []
  mockCalc.displayAllocations = []
  mockCalc.displayRemainder = 0
  mockCalc.handleAssetInputChange = vi.fn()
  mockCalc.handleTotalInvestmentChange = vi.fn()
  mockCalc.handleCalculate = vi.fn()
  mockCalc.handleReset = vi.fn()
}

beforeEach(() => {
  resetMock()
})

const validGroups: Group[] = [
  { id: 'g1', name: 'Stocks', targetPercentage: 60, deviationThreshold: 5 },
  { id: 'g2', name: 'Bonds', targetPercentage: 40, deviationThreshold: 3 },
]

const validAssets: Asset[] = [
  { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
  { id: 'a2', groupId: 'g2', name: 'Treasury', type: 'fixed', active: true },
]

describe('CalculatorView', () => {
  it('shows empty state when no groups or assets exist', () => {
    render(<CalculatorView />)
    expect(
      screen.getByText('Add groups and assets in the Portfolio tab to start calculating.'),
    ).toBeInTheDocument()
  })

  it('shows loading spinner while fetching', () => {
    mockCalc.isFetching = true
    render(<CalculatorView />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows percentage warning when percentagesValid is false', () => {
    mockCalc.hasData = true
    mockCalc.groups = validGroups
    mockCalc.assets = validAssets
    mockCalc.percentagesValid = false
    render(<CalculatorView />)
    expect(
      screen.getByText('Group percentages must total 100% before calculating.'),
    ).toBeInTheDocument()
  })

  it('shows no-active-assets warning when applicable', () => {
    mockCalc.hasData = true
    mockCalc.groups = validGroups
    mockCalc.assets = validAssets
    mockCalc.allGroupsHaveActiveAssets = false
    render(<CalculatorView />)
    expect(
      screen.getByText('Every group needs at least one active asset.'),
    ).toBeInTheDocument()
  })

  it('does not show no-active-assets warning when percentages are invalid', () => {
    mockCalc.hasData = true
    mockCalc.groups = validGroups
    mockCalc.assets = validAssets
    mockCalc.percentagesValid = false
    mockCalc.allGroupsHaveActiveAssets = false
    render(<CalculatorView />)
    expect(
      screen.queryByText('Every group needs at least one active asset.'),
    ).not.toBeInTheDocument()
  })

  it('renders the input form when data is available', () => {
    mockCalc.hasData = true
    mockCalc.groups = validGroups
    mockCalc.assets = validAssets
    render(<CalculatorView />)
    expect(screen.getByLabelText(/Amount to Invest/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Calculate/ })).toBeInTheDocument()
  })

  it('shows error alert when error is set', () => {
    mockCalc.hasData = true
    mockCalc.error = 'Something went wrong'
    render(<CalculatorView />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('does not show form or results while fetching', () => {
    mockCalc.isFetching = true
    mockCalc.hasData = true
    mockCalc.groups = validGroups
    mockCalc.assets = validAssets
    render(<CalculatorView />)
    expect(screen.queryByLabelText(/Amount to Invest/)).not.toBeInTheDocument()
  })
})
