import { vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCalculator } from './useCalculator'
import type { Group, Asset } from '../../types'

let mockGroups: Group[] = []
let mockAssets: Asset[] = []
let mockGroupsFetching = false
let mockAssetsFetching = false

vi.mock('rxdb-hooks', () => ({
  useRxCollection: (name: string) => ({
    _collection: name,
    find: () => ({ _collection: name }),
  }),
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

const validGroups: Group[] = [
  { id: 'g1', name: 'Stocks', targetPercentage: 60, deviationThreshold: 5 },
  { id: 'g2', name: 'Bonds', targetPercentage: 40, deviationThreshold: 3 },
]

const validAssets: Asset[] = [
  { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
  { id: 'a2', groupId: 'g2', name: 'Treasury', type: 'fixed', active: true },
]

describe('useCalculator', () => {
  it('returns isFetching true when groups are loading', () => {
    mockGroupsFetching = true
    const { result } = renderHook(() => useCalculator())
    expect(result.current.isFetching).toBe(true)
  })

  it('returns isFetching true when assets are loading', () => {
    mockAssetsFetching = true
    const { result } = renderHook(() => useCalculator())
    expect(result.current.isFetching).toBe(true)
  })

  it('returns hasData false when no groups or assets', () => {
    const { result } = renderHook(() => useCalculator())
    expect(result.current.hasData).toBe(false)
  })

  it('returns hasData true when groups and assets exist', () => {
    mockGroups = validGroups
    mockAssets = validAssets
    const { result } = renderHook(() => useCalculator())
    expect(result.current.hasData).toBe(true)
  })

  it('returns percentagesValid false when groups do not total 100', () => {
    mockGroups = [validGroups[0]]
    mockAssets = validAssets
    const { result } = renderHook(() => useCalculator())
    expect(result.current.percentagesValid).toBe(false)
  })

  it('returns percentagesValid true when groups total 100', () => {
    mockGroups = validGroups
    mockAssets = validAssets
    const { result } = renderHook(() => useCalculator())
    expect(result.current.percentagesValid).toBe(true)
  })

  it('returns allGroupsHaveActiveAssets false when a group lacks active assets', () => {
    mockGroups = validGroups
    mockAssets = [
      { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
      { id: 'a2', groupId: 'g2', name: 'Treasury', type: 'fixed', active: false },
    ]
    const { result } = renderHook(() => useCalculator())
    expect(result.current.allGroupsHaveActiveAssets).toBe(false)
  })

  it('returns isValid false when totalInvestment is empty', () => {
    mockGroups = validGroups
    mockAssets = validAssets
    const { result } = renderHook(() => useCalculator())
    expect(result.current.isValid).toBe(false)
  })

  it('returns isValid true when portfolio is valid and totalInvestment is set', () => {
    mockGroups = validGroups
    mockAssets = validAssets
    const { result } = renderHook(() => useCalculator())

    act(() => result.current.handleTotalInvestmentChange('1000'))

    expect(result.current.isValid).toBe(true)
  })

  it('updates asset inputs via handleAssetInputChange', () => {
    mockGroups = validGroups
    mockAssets = validAssets
    const { result } = renderHook(() => useCalculator())

    act(() => result.current.handleAssetInputChange('a1', 'currentValue', '500'))

    expect(result.current.assetInputs['a1'].currentValue).toBe('500')
  })

  it('preserves other fields as empty strings when updating a single field', () => {
    mockGroups = validGroups
    mockAssets = validAssets
    const { result } = renderHook(() => useCalculator())

    act(() => result.current.handleAssetInputChange('a1', 'currentValue', '500'))

    // unitPrice should be initialized to '' rather than undefined
    expect(result.current.assetInputs['a1'].unitPrice).toBe('')

    act(() => result.current.handleAssetInputChange('a1', 'unitPrice', '100'))

    // Both fields should be preserved
    expect(result.current.assetInputs['a1'].currentValue).toBe('500')
    expect(result.current.assetInputs['a1'].unitPrice).toBe('100')
  })

  it('calculates allocations via handleCalculate', () => {
    mockGroups = validGroups
    mockAssets = validAssets
    const { result } = renderHook(() => useCalculator())

    act(() => {
      result.current.handleAssetInputChange('a1', 'currentValue', '600')
      result.current.handleAssetInputChange('a1', 'unitPrice', '200')
      result.current.handleAssetInputChange('a2', 'currentValue', '400')
      result.current.handleTotalInvestmentChange('1000')
    })

    act(() => result.current.handleCalculate())

    expect(result.current.result).not.toBeNull()
    expect(result.current.result!.allocations).toHaveLength(2)
    expect(result.current.groupStats.size).toBe(2)
    expect(result.current.error).toBeNull()
  })

  it('sets error when calculation fails', () => {
    mockGroups = [validGroups[0]] // only 60%, not 100%
    mockAssets = [validAssets[0]]
    const { result } = renderHook(() => useCalculator())

    act(() => result.current.handleTotalInvestmentChange('1000'))
    act(() => result.current.handleCalculate())

    expect(result.current.error).toContain('60%')
    expect(result.current.result).toBeNull()
  })

  it('clears all state via handleReset', () => {
    mockGroups = validGroups
    mockAssets = validAssets
    const { result } = renderHook(() => useCalculator())

    act(() => {
      result.current.handleAssetInputChange('a1', 'currentValue', '500')
      result.current.handleTotalInvestmentChange('1000')
    })
    act(() => result.current.handleCalculate())

    expect(result.current.result).not.toBeNull()

    act(() => result.current.handleReset())

    expect(result.current.assetInputs).toEqual({})
    expect(result.current.totalInvestment).toBe('')
    expect(result.current.result).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('returns empty allocations when no result yet', () => {
    mockGroups = validGroups
    mockAssets = validAssets
    const { result } = renderHook(() => useCalculator())

    expect(result.current.emptyAllocations).toHaveLength(2)
    expect(result.current.emptyAllocations[0].amountToInvest).toBe(0)
    expect(result.current.emptyAllocations[1].amountToInvest).toBe(0)
  })

  it('returns empty groupStats when no result yet', () => {
    mockGroups = validGroups
    mockAssets = validAssets
    const { result } = renderHook(() => useCalculator())

    expect(result.current.groupStats.size).toBe(0)
  })

  it('returns displayAllocations from emptyAllocations when no result', () => {
    mockGroups = validGroups
    mockAssets = validAssets
    const { result } = renderHook(() => useCalculator())

    expect(result.current.displayAllocations).toEqual(result.current.emptyAllocations)
    expect(result.current.displayRemainder).toBe(0)
  })

  it('returns displayAllocations from result after calculation', () => {
    mockGroups = validGroups
    mockAssets = validAssets
    const { result } = renderHook(() => useCalculator())

    act(() => {
      result.current.handleAssetInputChange('a1', 'currentValue', '600')
      result.current.handleAssetInputChange('a1', 'unitPrice', '200')
      result.current.handleAssetInputChange('a2', 'currentValue', '400')
      result.current.handleTotalInvestmentChange('1000')
    })

    act(() => result.current.handleCalculate())

    expect(result.current.displayAllocations).toEqual(result.current.result!.allocations)
    expect(result.current.displayRemainder).toBe(result.current.result!.remainder)
  })
})
