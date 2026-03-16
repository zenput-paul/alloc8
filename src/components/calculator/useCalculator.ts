import { useState } from 'react'
import { useRxCollection, useRxQuery } from 'rxdb-hooks'
import { useTranslation } from 'react-i18next'
import type { Group, Asset, AssetInput, GroupStats } from '../../types'
import { calculateAllocations } from '../../lib/calculator'
import type { AllocationResult } from '../../lib/calculator'

export interface AssetFormValues {
  currentValue: string
  unitPrice: string
}

export function useCalculator() {
  const { t } = useTranslation()

  const groupsCollection = useRxCollection<Group>('groups')
  const assetsCollection = useRxCollection<Asset>('assets')
  const groupsQuery = groupsCollection?.find()
  const { result: groups, isFetching: groupsFetching } = useRxQuery(groupsQuery)
  const assetsQuery = assetsCollection?.find()
  const { result: assets, isFetching: assetsFetching } = useRxQuery(assetsQuery)

  const [assetInputs, setAssetInputs] = useState<Record<string, AssetFormValues>>({})
  const [totalInvestment, setTotalInvestment] = useState('')
  const [result, setResult] = useState<AllocationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isFetching = groupsFetching || assetsFetching
  const hasData = groups.length > 0 && assets.length > 0

  const totalPercentage = groups.reduce((sum, g) => sum + g.targetPercentage, 0)
  const percentagesValid = groups.length > 0 && totalPercentage === 100
  const allGroupsHaveActiveAssets = groups.every(g =>
    assets.some(a => a.groupId === g.id && a.active),
  )
  const isValid = percentagesValid && allGroupsHaveActiveAssets && totalInvestment !== ''

  function handleAssetInputChange(assetId: string, field: keyof AssetFormValues, value: string) {
    setAssetInputs(prev => ({
      ...prev,
      [assetId]: {
        ...(prev[assetId] ?? { currentValue: '', unitPrice: '' }),
        [field]: value,
      },
    }))
  }

  function handleReset() {
    setAssetInputs({})
    setTotalInvestment('')
    setResult(null)
    setError(null)
  }

  function handleCalculate() {
    setError(null)
    setResult(null)

    const parsedInputs: AssetInput[] = assets.map(asset => {
      const inputs = assetInputs[asset.id]
      return {
        assetId: asset.id,
        currentValue: parseFloat(inputs?.currentValue ?? '') || 0,
        unitPrice: parseFloat(inputs?.unitPrice ?? '') || 0,
      }
    })

    const parsedTotal = parseFloat(totalInvestment) || 0

    try {
      const allocationResult = calculateAllocations(groups, assets, parsedInputs, parsedTotal)
      setResult(allocationResult)
    } catch (err) {
      setError(t('calculator.calculationError', { message: (err as Error).message }))
    }
  }

  const emptyAllocations = assets.map(a => ({
    assetId: a.id,
    type: a.type,
    unitsToBuy: a.type === 'unit' ? 0 : null,
    amountToInvest: 0,
  }))

  const displayAllocations = result?.allocations ?? emptyAllocations
  const displayRemainder = result?.remainder ?? 0
  const groupStats: Map<string, GroupStats> = result?.groupStats ?? new Map()

  return {
    groups,
    assets,
    isFetching,
    hasData,
    percentagesValid,
    allGroupsHaveActiveAssets,
    isValid,
    assetInputs,
    totalInvestment,
    result,
    groupStats,
    error,
    emptyAllocations,
    displayAllocations,
    displayRemainder,
    handleAssetInputChange,
    handleTotalInvestmentChange: setTotalInvestment,
    handleCalculate,
    handleReset,
  }
}
