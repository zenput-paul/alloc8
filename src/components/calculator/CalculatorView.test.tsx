import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalculatorView } from './CalculatorView'
import type { Group, Asset } from '../../types'
import * as calculatorModule from '../../lib/calculator'

let mockGroups: Group[] = []
let mockAssets: Asset[] = []
let mockGroupsFetching = false
let mockAssetsFetching = false

vi.mock('rxdb-hooks', () => ({
  useRxCollection: (name: string) => {
    const sentinel = {
      _collection: name,
      find: () => ({ _collection: name }),
    }
    return sentinel
  },
  useRxQuery: (query: { _collection?: string } | undefined) => {
    if (!query || !query._collection) {
      return { result: [], isFetching: false }
    }
    if (query._collection === 'groups') {
      return { result: mockGroups, isFetching: mockGroupsFetching }
    }
    return { result: mockAssets, isFetching: mockAssetsFetching }
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockGroups = []
  mockAssets = []
  mockGroupsFetching = false
  mockAssetsFetching = false
})

describe('CalculatorView', () => {
  it('shows empty state when no groups or assets exist', () => {
    render(<CalculatorView />)
    expect(
      screen.getByText('Add groups and assets in the Portfolio tab to start calculating.'),
    ).toBeInTheDocument()
  })

  it('shows loading spinner while fetching', () => {
    mockGroupsFetching = true
    render(<CalculatorView />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows percentage warning when groups do not total 100%', () => {
    mockGroups = [
      { id: 'g1', name: 'Stocks', targetPercentage: 60, deviationThreshold: 5 },
    ]
    mockAssets = [
      { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
    ]
    render(<CalculatorView />)
    expect(
      screen.getByText('Group percentages must total 100% before calculating.'),
    ).toBeInTheDocument()
  })

  it('shows no-active-assets warning when applicable', () => {
    mockGroups = [
      { id: 'g1', name: 'Stocks', targetPercentage: 60, deviationThreshold: 5 },
      { id: 'g2', name: 'Bonds', targetPercentage: 40, deviationThreshold: 3 },
    ]
    mockAssets = [
      { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
      { id: 'a2', groupId: 'g2', name: 'Treasury', type: 'fixed', active: false },
    ]
    render(<CalculatorView />)
    expect(
      screen.getByText('Every group needs at least one active asset.'),
    ).toBeInTheDocument()
  })

  it('renders the input form when data is available', () => {
    mockGroups = [
      { id: 'g1', name: 'Stocks', targetPercentage: 60, deviationThreshold: 5 },
      { id: 'g2', name: 'Bonds', targetPercentage: 40, deviationThreshold: 3 },
    ]
    mockAssets = [
      { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
      { id: 'a2', groupId: 'g2', name: 'Treasury', type: 'fixed', active: true },
    ]
    render(<CalculatorView />)
    expect(screen.getByLabelText(/Amount to Invest/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Calculate/ })).toBeInTheDocument()
  })

  it('calculates and shows results', async () => {
    mockGroups = [
      { id: 'g1', name: 'Stocks', targetPercentage: 60, deviationThreshold: 5 },
      { id: 'g2', name: 'Bonds', targetPercentage: 40, deviationThreshold: 3 },
    ]
    mockAssets = [
      { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
      { id: 'a2', groupId: 'g2', name: 'Treasury', type: 'fixed', active: true },
    ]
    render(<CalculatorView />)

    // Fill in current values
    const currentValueFields = screen.getAllByLabelText(/Current Value/)
    await userEvent.type(currentValueFields[0], '1000')
    await userEvent.type(currentValueFields[1], '500')

    // Fill in unit price
    await userEvent.type(screen.getByLabelText(/Unit Price/), '200')

    // Fill in investment amount
    await userEvent.type(screen.getByLabelText(/Amount to Invest/), '1000')

    // Calculate
    await userEvent.click(screen.getByRole('button', { name: /Calculate/ }))

    // Should show results table
    expect(screen.getByText('Asset')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
  })

  it('shows error alert when calculateAllocations throws', async () => {
    mockGroups = [
      { id: 'g1', name: 'Stocks', targetPercentage: 60, deviationThreshold: 5 },
      { id: 'g2', name: 'Bonds', targetPercentage: 40, deviationThreshold: 3 },
    ]
    mockAssets = [
      { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
      { id: 'a2', groupId: 'g2', name: 'Treasury', type: 'fixed', active: true },
    ]
    render(<CalculatorView />)

    const spy = vi.spyOn(calculatorModule, 'calculateAllocations').mockImplementation(() => {
      throw new Error('Something went wrong')
    })

    await userEvent.type(screen.getAllByLabelText(/Current Value/)[0], '1000')
    await userEvent.type(screen.getAllByLabelText(/Current Value/)[1], '500')
    await userEvent.type(screen.getByLabelText(/Unit Price/), '200')
    await userEvent.type(screen.getByLabelText(/Amount to Invest/), '1000')
    await userEvent.click(screen.getByRole('button', { name: /Calculate/ }))

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()

    spy.mockRestore()
  })

  it('resets the form and results, then recalculates with new values', async () => {
    mockGroups = [
      { id: 'g1', name: 'Stocks', targetPercentage: 60, deviationThreshold: 5 },
      { id: 'g2', name: 'Bonds', targetPercentage: 40, deviationThreshold: 3 },
    ]
    mockAssets = [
      { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
      { id: 'a2', groupId: 'g2', name: 'Treasury', type: 'fixed', active: true },
    ]
    render(<CalculatorView />)

    // Fill in and calculate
    await userEvent.type(screen.getAllByLabelText(/Current Value/)[0], '1000')
    await userEvent.type(screen.getAllByLabelText(/Current Value/)[1], '500')
    await userEvent.type(screen.getByLabelText(/Unit Price/), '200')
    await userEvent.type(screen.getByLabelText(/Amount to Invest/), '1000')
    await userEvent.click(screen.getByRole('button', { name: /Calculate/ }))

    // Verify results are shown
    expect(screen.getByText('Asset')).toBeInTheDocument()

    // Click Reset
    await userEvent.click(screen.getByRole('button', { name: /Reset/ }))

    // Verify form is cleared
    const currentValueFields = screen.getAllByLabelText(/Current Value/)
    expect(currentValueFields[0]).toHaveValue(null)
    expect(currentValueFields[1]).toHaveValue(null)
    expect(screen.getByLabelText(/Amount to Invest/)).toHaveValue(null)

    // Reset button should be gone (no results)
    expect(screen.queryByRole('button', { name: /Reset/ })).not.toBeInTheDocument()

    // Fill in new values and recalculate
    await userEvent.type(screen.getAllByLabelText(/Current Value/)[0], '2000')
    await userEvent.type(screen.getAllByLabelText(/Current Value/)[1], '1000')
    await userEvent.type(screen.getByLabelText(/Unit Price/), '150')
    await userEvent.type(screen.getByLabelText(/Amount to Invest/), '500')
    await userEvent.click(screen.getByRole('button', { name: /Calculate/ }))

    // Results should show again
    expect(screen.getByText('Asset')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
  })

  it('shows loading spinner when groupsFetching=false but assetsFetching=true', () => {
    mockGroups = [
      { id: 'g1', name: 'Stocks', targetPercentage: 100, deviationThreshold: 5 },
    ]
    mockAssets = []
    mockGroupsFetching = false
    mockAssetsFetching = true
    render(<CalculatorView />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('submits the form via Enter key', async () => {
    mockGroups = [
      { id: 'g1', name: 'Stocks', targetPercentage: 60, deviationThreshold: 5 },
      { id: 'g2', name: 'Bonds', targetPercentage: 40, deviationThreshold: 3 },
    ]
    mockAssets = [
      { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
      { id: 'a2', groupId: 'g2', name: 'Treasury', type: 'fixed', active: true },
    ]
    render(<CalculatorView />)

    await userEvent.type(screen.getAllByLabelText(/Current Value/)[0], '1000')
    await userEvent.type(screen.getAllByLabelText(/Current Value/)[1], '500')
    await userEvent.type(screen.getByLabelText(/Unit Price/), '200')
    await userEvent.type(screen.getByLabelText(/Amount to Invest/), '1000')

    // Submit via Enter key on the investment amount field
    await userEvent.keyboard('{Enter}')

    // Should show results table
    await waitFor(() => {
      expect(screen.getByText('Asset')).toBeInTheDocument()
      expect(screen.getByText('Amount')).toBeInTheDocument()
    })
  })
})
