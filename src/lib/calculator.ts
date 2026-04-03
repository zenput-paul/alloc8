import type {
  Group,
  Asset,
  AssetInput,
  AssetAllocation,
  GroupStats,
} from '../types';

export interface AllocationResult {
  allocations: AssetAllocation[];
  remainder: number;
  groupStats: Map<string, GroupStats>;
}

interface GroupContext {
  groups: Group[];
  assets: Asset[];
  inputMap: Map<string, AssetInput>;
  groupCurrentValue: Map<string, number>;
  groupActiveAssets: Map<string, Asset[]>;
  futureTotal: number;
}

const ON_TARGET_EPSILON = 0.05;

export { ON_TARGET_EPSILON };

function validateInputs(
  groups: Group[],
  assets: Asset[],
  totalInvestment: number,
): void {
  if (!Number.isFinite(totalInvestment)) {
    throw new Error('Total investment must be a finite number');
  }
  if (totalInvestment < 0) {
    throw new Error('Total investment must not be negative');
  }

  const totalTargetPercentage = groups.reduce(
    (sum, g) => sum + g.targetPercentage,
    0,
  );
  if (totalTargetPercentage !== 100) {
    throw new Error(
      `Group target percentages total ${totalTargetPercentage}%, must equal 100%`,
    );
  }

  for (const group of groups) {
    if (group.targetPercentage <= 0) {
      throw new Error(
        `Group "${group.name}" has a target percentage of 0% or less`,
      );
    }
    if (group.deviationThreshold >= group.targetPercentage) {
      throw new Error(
        `Group "${group.name}" has a deviation threshold >= its target percentage`,
      );
    }
    const hasActive = assets.some((a) => a.groupId === group.id && a.active);
    if (!hasActive) {
      throw new Error(`Group "${group.name}" has no active assets`);
    }
  }
}

function buildGroupContext(
  groups: Group[],
  assets: Asset[],
  assetInputs: AssetInput[],
  totalInvestment: number,
): GroupContext {
  const inputMap = new Map(assetInputs.map((i) => [i.assetId, i]));
  const groupCurrentValue = new Map<string, number>();
  const groupActiveAssets = new Map<string, Asset[]>();

  for (const group of groups) {
    groupCurrentValue.set(group.id, 0);
    groupActiveAssets.set(group.id, []);
  }

  for (const asset of assets) {
    const value = inputMap.get(asset.id)?.currentValue ?? 0;
    groupCurrentValue.set(
      asset.groupId,
      (groupCurrentValue.get(asset.groupId) ?? 0) + value,
    );
    if (asset.active) {
      groupActiveAssets.get(asset.groupId)?.push(asset);
    }
  }

  const totalCurrentValue = Array.from(groupCurrentValue.values()).reduce(
    (s, v) => s + v,
    0,
  );

  return {
    groups,
    assets,
    inputMap,
    groupCurrentValue,
    groupActiveAssets,
    futureTotal: totalCurrentValue + totalInvestment,
  };
}

function groupPct(
  ctx: GroupContext,
  groupId: string,
  extraAllocation = 0,
): number {
  return (
    ((ctx.groupCurrentValue.get(groupId)! + extraAllocation) /
      ctx.futureTotal) *
    100
  );
}

function allocateToBelowRangeGroups(
  ctx: GroupContext,
  groupAllocation: Map<string, number>,
  remaining: number,
): number {
  const belowRange = ctx.groups.filter(
    (g) => groupPct(ctx, g.id) < g.targetPercentage - g.deviationThreshold,
  );

  if (belowRange.length === 0) return remaining;

  const totalDeficit = belowRange.reduce(
    (sum, g) => sum + (g.targetPercentage - groupPct(ctx, g.id)),
    0,
  );

  for (const group of belowRange) {
    if ((ctx.groupActiveAssets.get(group.id)?.length ?? 0) === 0) continue;
    const deficit = group.targetPercentage - groupPct(ctx, group.id);
    const share = (deficit / totalDeficit) * remaining;
    const targetValue = (group.targetPercentage / 100) * ctx.futureTotal;
    const maxAllocation = Math.max(
      0,
      targetValue - ctx.groupCurrentValue.get(group.id)!,
    );
    groupAllocation.set(group.id, Math.min(share, maxAllocation));
  }

  return (
    remaining - Array.from(groupAllocation.values()).reduce((s, v) => s + v, 0)
  );
}

function distributeToEligibleGroups(
  ctx: GroupContext,
  groupAllocation: Map<string, number>,
  remaining: number,
): number {
  const eligible = ctx.groups.filter((g) => {
    const totalValue =
      ctx.groupCurrentValue.get(g.id)! + groupAllocation.get(g.id)!;
    const pct = (totalValue / ctx.futureTotal) * 100;
    return (
      pct < g.targetPercentage + g.deviationThreshold &&
      (ctx.groupActiveAssets.get(g.id)?.length ?? 0) > 0
    );
  });

  if (remaining <= 0 || eligible.length === 0) return remaining;

  const totalTarget = eligible.reduce((s, g) => s + g.targetPercentage, 0);
  for (const group of eligible) {
    groupAllocation.set(
      group.id,
      groupAllocation.get(group.id)! +
        (group.targetPercentage / totalTarget) * remaining,
    );
  }
  return 0;
}

function capAndRebalance(
  ctx: GroupContext,
  groupAllocation: Map<string, number>,
  remaining: number,
): number {
  for (let i = 0; i < 10; i++) {
    let excess = 0;
    const capped: string[] = [];

    for (const group of ctx.groups) {
      const totalValue =
        ctx.groupCurrentValue.get(group.id)! + groupAllocation.get(group.id)!;
      const pct = (totalValue / ctx.futureTotal) * 100;
      const cap = group.targetPercentage + group.deviationThreshold;

      if (pct > cap && groupAllocation.get(group.id)! > 0) {
        const capValue = (cap / 100) * ctx.futureTotal;
        const maxAlloc = Math.max(
          0,
          capValue - ctx.groupCurrentValue.get(group.id)!,
        );
        excess += groupAllocation.get(group.id)! - maxAlloc;
        groupAllocation.set(group.id, maxAlloc);
        capped.push(group.id);
      }
    }

    if (excess <= 0.01) break;

    const underCap = ctx.groups.filter(
      (g) =>
        !capped.includes(g.id) &&
        (ctx.groupActiveAssets.get(g.id)?.length ?? 0) > 0 &&
        ((ctx.groupCurrentValue.get(g.id)! + groupAllocation.get(g.id)!) /
          ctx.futureTotal) *
          100 <
          g.targetPercentage + g.deviationThreshold,
    );

    if (underCap.length === 0) {
      remaining += excess;
      break;
    }

    const totalTarget = underCap.reduce((s, g) => s + g.targetPercentage, 0);
    for (const group of underCap) {
      groupAllocation.set(
        group.id,
        groupAllocation.get(group.id)! +
          (group.targetPercentage / totalTarget) * excess,
      );
    }
  }

  return remaining;
}

function distributeToAssets(
  ctx: GroupContext,
  groupAllocation: Map<string, number>,
  remaining: number,
): { allocations: AssetAllocation[]; totalRemainder: number } {
  let totalRemainder = remaining;

  const allocations: AssetAllocation[] = ctx.assets.map((asset) => {
    const activeAssets = ctx.groupActiveAssets.get(asset.groupId) ?? [];
    const groupAmount = groupAllocation.get(asset.groupId) ?? 0;

    if (!asset.active || activeAssets.length === 0) {
      return {
        assetId: asset.id,
        type: asset.type,
        unitsToBuy: asset.type === 'unit' ? 0 : null,
        amountToInvest: 0,
      };
    }

    const assetShare = groupAmount / activeAssets.length;
    const input = ctx.inputMap.get(asset.id);

    if (asset.type === 'unit') {
      const unitPrice = input?.unitPrice ?? 0;
      if (unitPrice <= 0) {
        totalRemainder += assetShare;
        return {
          assetId: asset.id,
          type: asset.type,
          unitsToBuy: 0,
          amountToInvest: 0,
        };
      }
      const unitsToBuy = Math.floor(assetShare / unitPrice);
      const amountToInvest = unitsToBuy * unitPrice;
      totalRemainder += assetShare - amountToInvest;
      return {
        assetId: asset.id,
        type: asset.type,
        unitsToBuy,
        amountToInvest,
      };
    }

    return {
      assetId: asset.id,
      type: asset.type,
      unitsToBuy: null,
      amountToInvest: assetShare,
    };
  });

  return { allocations, totalRemainder };
}

function reinvestRemainderInUnits(
  ctx: GroupContext,
  groupAllocation: Map<string, number>,
  allocations: AssetAllocation[],
  totalRemainder: number,
): number {
  let changed = true;
  while (changed && totalRemainder > 0) {
    changed = false;

    const unitAssets = allocations
      .filter((a) => a.type === 'unit')
      .map((a) => {
        const asset = ctx.assets.find((ast) => ast.id === a.assetId)!;
        const unitPrice = ctx.inputMap.get(a.assetId)?.unitPrice ?? 0;
        const group = ctx.groups.find((g) => g.id === asset.groupId)!;
        const groupValue =
          ctx.groupCurrentValue.get(group.id)! + groupAllocation.get(group.id)!;
        const gap =
          group.targetPercentage - (groupValue / ctx.futureTotal) * 100;
        return { allocation: a, unitPrice, gap };
      })
      .filter((x) => x.unitPrice > 0 && x.unitPrice <= totalRemainder)
      .sort((a, b) => b.gap - a.gap);

    for (const { allocation, unitPrice } of unitAssets) {
      if (unitPrice <= totalRemainder) {
        allocation.unitsToBuy = (allocation.unitsToBuy ?? 0) + 1;
        allocation.amountToInvest += unitPrice;
        totalRemainder -= unitPrice;
        changed = true;
        break;
      }
    }
  }

  return totalRemainder;
}

function distributeRemainderToFixedAssets(
  ctx: GroupContext,
  allocations: AssetAllocation[],
  totalRemainder: number,
): number {
  if (totalRemainder <= 0.005) return totalRemainder;

  const fixedByGroup = new Map<string, AssetAllocation[]>();
  for (const alloc of allocations) {
    if (alloc.type !== 'fixed') continue;
    const asset = ctx.assets.find((a) => a.id === alloc.assetId);
    if (!asset || !asset.active) continue;
    const list = fixedByGroup.get(asset.groupId) ?? [];
    list.push(alloc);
    fixedByGroup.set(asset.groupId, list);
  }

  if (fixedByGroup.size === 0) return totalRemainder;

  const allocatedByGroup = new Map<string, number>();
  for (const alloc of allocations) {
    const asset = ctx.assets.find((a) => a.id === alloc.assetId);
    if (!asset) continue;
    allocatedByGroup.set(
      asset.groupId,
      (allocatedByGroup.get(asset.groupId) ?? 0) + alloc.amountToInvest,
    );
  }

  const eligibleGroups = ctx.groups.filter((g) => {
    if (!fixedByGroup.has(g.id)) return false;
    const groupValue =
      ctx.groupCurrentValue.get(g.id)! + (allocatedByGroup.get(g.id) ?? 0);
    const pct = (groupValue / ctx.futureTotal) * 100;
    return pct < g.targetPercentage + g.deviationThreshold;
  });

  if (eligibleGroups.length === 0) return totalRemainder;

  const totalTarget = eligibleGroups.reduce(
    (s, g) => s + g.targetPercentage,
    0,
  );
  for (const group of eligibleGroups) {
    const groupShare = (group.targetPercentage / totalTarget) * totalRemainder;
    const fixedAllocs = fixedByGroup.get(group.id)!;
    const perAsset = groupShare / fixedAllocs.length;
    for (const alloc of fixedAllocs) {
      alloc.amountToInvest += perAsset;
    }
  }

  return 0;
}

function computeGroupStats(
  ctx: GroupContext,
  allocations: AssetAllocation[],
  totalInvestment: number,
): Map<string, GroupStats> {
  const totalCurrentValue = Array.from(ctx.groupCurrentValue.values()).reduce(
    (s, v) => s + v,
    0,
  );
  const totalAfterValue = totalCurrentValue + totalInvestment;

  const allocationByGroup = new Map<string, number>();
  for (const alloc of allocations) {
    const asset = ctx.assets.find((a) => a.id === alloc.assetId);
    if (!asset) continue;
    allocationByGroup.set(
      asset.groupId,
      (allocationByGroup.get(asset.groupId) ?? 0) + alloc.amountToInvest,
    );
  }

  const stats = new Map<string, GroupStats>();
  for (const group of ctx.groups) {
    const currentVal = ctx.groupCurrentValue.get(group.id) ?? 0;
    const invested = allocationByGroup.get(group.id) ?? 0;
    stats.set(group.id, {
      currentPct:
        totalCurrentValue > 0 ? (currentVal / totalCurrentValue) * 100 : 0,
      afterPct:
        totalAfterValue > 0
          ? ((currentVal + invested) / totalAfterValue) * 100
          : 0,
    });
  }

  return stats;
}

export function calculateAllocations(
  groups: Group[],
  assets: Asset[],
  assetInputs: AssetInput[],
  totalInvestment: number,
): AllocationResult {
  validateInputs(groups, assets, totalInvestment);

  if (totalInvestment === 0) {
    const ctx = buildGroupContext(groups, assets, assetInputs, totalInvestment);
    const allocations = assets.map((a) => ({
      assetId: a.id,
      type: a.type,
      unitsToBuy: a.type === 'unit' ? 0 : null,
      amountToInvest: 0,
    }));
    return {
      allocations,
      remainder: 0,
      groupStats: computeGroupStats(ctx, allocations, totalInvestment),
    };
  }

  const ctx = buildGroupContext(groups, assets, assetInputs, totalInvestment);

  const groupAllocation = new Map<string, number>();
  for (const group of groups) {
    groupAllocation.set(group.id, 0);
  }

  let remaining = totalInvestment;
  remaining = allocateToBelowRangeGroups(ctx, groupAllocation, remaining);
  remaining = distributeToEligibleGroups(ctx, groupAllocation, remaining);
  remaining = capAndRebalance(ctx, groupAllocation, remaining);

  const { allocations, totalRemainder } = distributeToAssets(
    ctx,
    groupAllocation,
    remaining,
  );
  let remainder = reinvestRemainderInUnits(
    ctx,
    groupAllocation,
    allocations,
    totalRemainder,
  );
  remainder = distributeRemainderToFixedAssets(ctx, allocations, remainder);

  return {
    allocations,
    remainder,
    groupStats: computeGroupStats(ctx, allocations, totalInvestment),
  };
}
