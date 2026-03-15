import type { Group, Asset, AssetInput, AssetAllocation } from '../types'

export interface AllocationResult {
  allocations: AssetAllocation[]
  remainder: number
}

export function calculateAllocations(
  groups: Group[],
  assets: Asset[],
  assetInputs: AssetInput[],
  totalInvestment: number,
): AllocationResult {
  const totalTargetPercentage = groups.reduce((sum, g) => sum + g.targetPercentage, 0)
  if (totalTargetPercentage !== 100) {
    throw new Error(`Group target percentages total ${totalTargetPercentage}%, must equal 100%`)
  }

  for (const group of groups) {
    if (group.targetPercentage <= 0) {
      throw new Error(`Group "${group.name}" has a target percentage of 0% or less`)
    }
    if (group.deviationThreshold >= group.targetPercentage) {
      throw new Error(`Group "${group.name}" has a deviation threshold >= its target percentage`)
    }
    const hasActive = assets.some(a => a.groupId === group.id && a.active)
    if (!hasActive) {
      throw new Error(`Group "${group.name}" has no active assets`)
    }
  }

  if (totalInvestment === 0) {
    return {
      allocations: assets.map(a => ({
        assetId: a.id,
        type: a.type,
        unitsToBuy: a.type === 'unit' ? 0 : null,
        amountToInvest: 0,
      })),
      remainder: 0,
    }
  }

  const inputMap = new Map(assetInputs.map(i => [i.assetId, i]))

  // Step 1: Compute current value per group and collect active assets
  const groupCurrentValue = new Map<string, number>()
  const groupActiveAssets = new Map<string, Asset[]>()

  for (const group of groups) {
    groupCurrentValue.set(group.id, 0)
    groupActiveAssets.set(group.id, [])
  }

  for (const asset of assets) {
    const value = inputMap.get(asset.id)?.currentValue ?? 0
    groupCurrentValue.set(asset.groupId, (groupCurrentValue.get(asset.groupId) ?? 0) + value)
    if (asset.active) {
      groupActiveAssets.get(asset.groupId)?.push(asset)
    }
  }

  const totalCurrentValue = Array.from(groupCurrentValue.values()).reduce((s, v) => s + v, 0)
  const futureTotal = totalCurrentValue + totalInvestment

  // Step 2: Classify groups by range
  const groupAllocation = new Map<string, number>()
  for (const group of groups) {
    groupAllocation.set(group.id, 0)
  }

  let remaining = totalInvestment

  // Pass 1: Priority allocation to below-range groups
  const belowRange: Group[] = []
  for (const group of groups) {
    const currentPct = (groupCurrentValue.get(group.id)! / futureTotal) * 100
    if (currentPct < group.targetPercentage - group.deviationThreshold) {
      belowRange.push(group)
    }
  }

  if (belowRange.length > 0) {
    const totalDeficit = belowRange.reduce((sum, g) => {
      const currentPct = (groupCurrentValue.get(g.id)! / futureTotal) * 100
      return sum + (g.targetPercentage - currentPct)
    }, 0)

    for (const group of belowRange) {
      if ((groupActiveAssets.get(group.id)?.length ?? 0) === 0) continue

      const currentPct = (groupCurrentValue.get(group.id)! / futureTotal) * 100
      const deficit = group.targetPercentage - currentPct
      const share = (deficit / totalDeficit) * remaining

      // Cap so group doesn't exceed target
      const targetValue = (group.targetPercentage / 100) * futureTotal
      const maxAllocation = Math.max(0, targetValue - groupCurrentValue.get(group.id)!)
      groupAllocation.set(group.id, Math.min(share, maxAllocation))
    }

    remaining -= Array.from(groupAllocation.values()).reduce((s, v) => s + v, 0)
  }

  // Pass 2: Distribute remaining to groups not over target+threshold
  const eligible = groups.filter(g => {
    const totalValue = groupCurrentValue.get(g.id)! + groupAllocation.get(g.id)!
    const pct = (totalValue / futureTotal) * 100
    return pct < g.targetPercentage + g.deviationThreshold &&
      (groupActiveAssets.get(g.id)?.length ?? 0) > 0
  })

  if (remaining > 0 && eligible.length > 0) {
    const totalTarget = eligible.reduce((s, g) => s + g.targetPercentage, 0)
    for (const group of eligible) {
      groupAllocation.set(
        group.id,
        groupAllocation.get(group.id)! + (group.targetPercentage / totalTarget) * remaining,
      )
    }
    remaining = 0
  }

  // Pass 3: Cap groups exceeding target+threshold, redistribute excess
  for (let i = 0; i < 10; i++) {
    let excess = 0
    const capped: string[] = []

    for (const group of groups) {
      const totalValue = groupCurrentValue.get(group.id)! + groupAllocation.get(group.id)!
      const pct = (totalValue / futureTotal) * 100
      const cap = group.targetPercentage + group.deviationThreshold

      if (pct > cap && groupAllocation.get(group.id)! > 0) {
        const capValue = (cap / 100) * futureTotal
        const maxAlloc = Math.max(0, capValue - groupCurrentValue.get(group.id)!)
        excess += groupAllocation.get(group.id)! - maxAlloc
        groupAllocation.set(group.id, maxAlloc)
        capped.push(group.id)
      }
    }

    if (excess <= 0.01) break

    const underCap = groups.filter(g =>
      !capped.includes(g.id) &&
      (groupActiveAssets.get(g.id)?.length ?? 0) > 0 &&
      ((groupCurrentValue.get(g.id)! + groupAllocation.get(g.id)!) / futureTotal) * 100 <
        g.targetPercentage + g.deviationThreshold,
    )

    if (underCap.length === 0) {
      remaining += excess
      break
    }

    const totalTarget = underCap.reduce((s, g) => s + g.targetPercentage, 0)
    for (const group of underCap) {
      groupAllocation.set(
        group.id,
        groupAllocation.get(group.id)! + (group.targetPercentage / totalTarget) * excess,
      )
    }
  }

  // Step 6-7: Distribute within groups and compute per-asset results
  let totalRemainder = remaining

  const allocations: AssetAllocation[] = assets.map(asset => {
    const activeAssets = groupActiveAssets.get(asset.groupId) ?? []
    const groupAmount = groupAllocation.get(asset.groupId) ?? 0

    if (!asset.active || activeAssets.length === 0) {
      return {
        assetId: asset.id,
        type: asset.type,
        unitsToBuy: asset.type === 'unit' ? 0 : null,
        amountToInvest: 0,
      }
    }

    const assetShare = groupAmount / activeAssets.length
    const input = inputMap.get(asset.id)

    if (asset.type === 'unit') {
      const unitPrice = input?.unitPrice ?? 0
      if (unitPrice <= 0) {
        totalRemainder += assetShare
        return { assetId: asset.id, type: asset.type, unitsToBuy: 0, amountToInvest: 0 }
      }
      const unitsToBuy = Math.floor(assetShare / unitPrice)
      const amountToInvest = unitsToBuy * unitPrice
      totalRemainder += assetShare - amountToInvest
      return { assetId: asset.id, type: asset.type, unitsToBuy, amountToInvest }
    }

    return { assetId: asset.id, type: asset.type, unitsToBuy: null, amountToInvest: assetShare }
  })

  // Step 8: Try to invest remainder by buying additional units
  // Prioritize groups furthest below target after initial allocation
  let changed = true
  while (changed && totalRemainder > 0) {
    changed = false

    const unitAssets = allocations
      .filter(a => a.type === 'unit')
      .map(a => {
        const asset = assets.find(ast => ast.id === a.assetId)!
        const input = inputMap.get(a.assetId)
        const unitPrice = input?.unitPrice ?? 0
        const group = groups.find(g => g.id === asset.groupId)!
        const groupValue = groupCurrentValue.get(group.id)! + groupAllocation.get(group.id)!
        const currentPct = (groupValue / futureTotal) * 100
        const gap = group.targetPercentage - currentPct
        return { allocation: a, unitPrice, gap }
      })
      .filter(x => x.unitPrice > 0 && x.unitPrice <= totalRemainder)
      .sort((a, b) => b.gap - a.gap) // largest gap first

    for (const { allocation, unitPrice } of unitAssets) {
      if (unitPrice <= totalRemainder) {
        allocation.unitsToBuy = (allocation.unitsToBuy ?? 0) + 1
        allocation.amountToInvest += unitPrice
        totalRemainder -= unitPrice
        changed = true
        break // re-sort after each purchase since gaps change
      }
    }
  }

  return { allocations, remainder: totalRemainder }
}
