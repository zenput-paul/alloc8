// @vitest-environment node
import { calculateAllocations } from './calculator';
import type { Group, Asset, AssetInput } from '../types';

function makeGroup(overrides: Partial<Group> & { id: string }): Group {
  return {
    name: `Group ${overrides.id}`,
    targetPercentage: 50,
    deviationThreshold: 5,
    ...overrides,
  };
}

function makeAsset(
  overrides: Partial<Asset> & { id: string; groupId: string },
): Asset {
  return {
    name: `Asset ${overrides.id}`,
    type: 'fixed',
    active: true,
    ...overrides,
  };
}

function makeInput(
  assetId: string,
  currentValue: number,
  unitPrice = 0,
): AssetInput {
  return { assetId, currentValue, unitPrice };
}

describe('calculateAllocations', () => {
  describe('validation', () => {
    it('throws when group target percentages do not total 100%', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 60, deviationThreshold: 5 }),
        makeGroup({ id: 'g2', targetPercentage: 30, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1' }),
        makeAsset({ id: 'a2', groupId: 'g2' }),
      ];
      const inputs = [makeInput('a1', 0), makeInput('a2', 0)];

      expect(() => calculateAllocations(groups, assets, inputs, 100)).toThrow(
        'Group target percentages total 90%, must equal 100%',
      );
    });

    it('accepts percentages that total 100% with floating-point rounding', () => {
      const groups = [
        makeGroup({
          id: 'g1',
          targetPercentage: 33.33,
          deviationThreshold: 5,
        }),
        makeGroup({
          id: 'g2',
          targetPercentage: 33.33,
          deviationThreshold: 5,
        }),
        makeGroup({
          id: 'g3',
          targetPercentage: 33.34,
          deviationThreshold: 5,
        }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1' }),
        makeAsset({ id: 'a2', groupId: 'g2' }),
        makeAsset({ id: 'a3', groupId: 'g3' }),
      ];
      const inputs = [
        makeInput('a1', 0),
        makeInput('a2', 0),
        makeInput('a3', 0),
      ];

      expect(() =>
        calculateAllocations(groups, assets, inputs, 100),
      ).not.toThrow();
    });

    it('throws when a group has target percentage of 0%', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 0, deviationThreshold: 5 }),
        makeGroup({ id: 'g2', targetPercentage: 100, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1' }),
        makeAsset({ id: 'a2', groupId: 'g2' }),
      ];
      const inputs = [makeInput('a1', 0), makeInput('a2', 0)];

      expect(() => calculateAllocations(groups, assets, inputs, 100)).toThrow(
        'Group "Group g1" has a target percentage of 0% or less',
      );
    });

    it('throws when a group has deviation threshold >= target percentage', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 5, deviationThreshold: 10 }),
        makeGroup({ id: 'g2', targetPercentage: 95, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1' }),
        makeAsset({ id: 'a2', groupId: 'g2' }),
      ];
      const inputs = [makeInput('a1', 0), makeInput('a2', 0)];

      expect(() => calculateAllocations(groups, assets, inputs, 100)).toThrow(
        'Group "Group g1" has a deviation threshold >= its target percentage',
      );
    });

    it('throws when a group has no active assets', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 50, deviationThreshold: 5 }),
        makeGroup({ id: 'g2', targetPercentage: 50, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1', active: false }),
        makeAsset({ id: 'a2', groupId: 'g2', active: true }),
      ];
      const inputs = [makeInput('a1', 100), makeInput('a2', 100)];

      expect(() => calculateAllocations(groups, assets, inputs, 100)).toThrow(
        'Group "Group g1" has no active assets',
      );
    });

    it('throws when a group has no assets at all', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 100, deviationThreshold: 5 }),
      ];

      expect(() => calculateAllocations(groups, [], [], 1000)).toThrow(
        'Group "Group g1" has no active assets',
      );
    });

    it('throws for negative totalInvestment', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 60, deviationThreshold: 5 }),
        makeGroup({ id: 'g2', targetPercentage: 40, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1' }),
        makeAsset({ id: 'a2', groupId: 'g2' }),
      ];
      const inputs = [makeInput('a1', 100), makeInput('a2', 100)];

      expect(() => calculateAllocations(groups, assets, inputs, -500)).toThrow(
        'Total investment must not be negative',
      );
    });

    it('throws for NaN totalInvestment', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 100, deviationThreshold: 5 }),
      ];
      const assets = [makeAsset({ id: 'a1', groupId: 'g1' })];
      const inputs = [makeInput('a1', 100)];

      expect(() => calculateAllocations(groups, assets, inputs, NaN)).toThrow(
        'Total investment must be a finite number',
      );
    });

    it('throws when an active asset has no input data', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 100, deviationThreshold: 5 }),
      ];
      const assets = [makeAsset({ id: 'a1', groupId: 'g1' })];

      expect(() => calculateAllocations(groups, assets, [], 100)).toThrow(
        'Active asset "Asset a1" has no input data',
      );
    });

    it('throws when an asset has negative current value', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 100, deviationThreshold: 5 }),
      ];
      const assets = [makeAsset({ id: 'a1', groupId: 'g1' })];
      const inputs = [makeInput('a1', -100)];

      expect(() => calculateAllocations(groups, assets, inputs, 100)).toThrow(
        'Asset "Asset a1" has an invalid current value',
      );
    });

    it('throws when a unit asset has negative unit price', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 100, deviationThreshold: 5 }),
      ];
      const assets = [makeAsset({ id: 'a1', groupId: 'g1', type: 'unit' })];
      const inputs = [makeInput('a1', 100, -10)];

      expect(() => calculateAllocations(groups, assets, inputs, 100)).toThrow(
        'Asset "Asset a1" has an invalid unit price',
      );
    });

    it('throws for Infinity totalInvestment', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 100, deviationThreshold: 5 }),
      ];
      const assets = [makeAsset({ id: 'a1', groupId: 'g1' })];
      const inputs = [makeInput('a1', 100)];

      expect(() =>
        calculateAllocations(groups, assets, inputs, Infinity),
      ).toThrow('Total investment must be a finite number');
    });
  });

  describe('group allocation', () => {
    it('distributes proportionally to target percentages from zero', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 60, deviationThreshold: 5 }),
        makeGroup({ id: 'g2', targetPercentage: 40, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1' }),
        makeAsset({ id: 'a2', groupId: 'g2' }),
      ];
      const inputs = [makeInput('a1', 0), makeInput('a2', 0)];

      const result = calculateAllocations(groups, assets, inputs, 1000);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      const a2 = result.allocations.find((a) => a.assetId === 'a2')!;
      expect(a1.amountToInvest).toBeCloseTo(600);
      expect(a2.amountToInvest).toBeCloseTo(400);
    });

    it('prioritizes below-range groups', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 50, deviationThreshold: 2 }),
        makeGroup({ id: 'g2', targetPercentage: 50, deviationThreshold: 2 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1' }),
        makeAsset({ id: 'a2', groupId: 'g2' }),
      ];
      const inputs = [makeInput('a1', 300), makeInput('a2', 700)];

      const result = calculateAllocations(groups, assets, inputs, 200);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      const a2 = result.allocations.find((a) => a.assetId === 'a2')!;
      expect(a1.amountToInvest).toBeCloseTo(200);
      expect(a2.amountToInvest).toBeCloseTo(0);
    });

    it('prioritizes below-range groups but still allocates to others', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 60, deviationThreshold: 5 }),
        makeGroup({ id: 'g2', targetPercentage: 40, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1' }),
        makeAsset({ id: 'a2', groupId: 'g2' }),
      ];
      const inputs = [makeInput('a1', 400), makeInput('a2', 400)];

      const result = calculateAllocations(groups, assets, inputs, 400);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      const a2 = result.allocations.find((a) => a.assetId === 'a2')!;
      expect(a1.amountToInvest).toBeCloseTo(320);
      expect(a2.amountToInvest).toBeCloseTo(80);
    });

    it('caps groups that exceed target + threshold', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 80, deviationThreshold: 5 }),
        makeGroup({ id: 'g2', targetPercentage: 20, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1' }),
        makeAsset({ id: 'a2', groupId: 'g2' }),
      ];
      const inputs = [makeInput('a1', 900), makeInput('a2', 100)];

      const result = calculateAllocations(groups, assets, inputs, 100);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      const a2 = result.allocations.find((a) => a.assetId === 'a2')!;
      expect(a1.amountToInvest).toBeCloseTo(0);
      expect(a2.amountToInvest).toBeCloseTo(100);
    });

    it('returns zero allocations for zero investment', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 100, deviationThreshold: 5 }),
      ];
      const assets = [makeAsset({ id: 'a1', groupId: 'g1' })];
      const inputs = [makeInput('a1', 100)];

      const result = calculateAllocations(groups, assets, inputs, 0);

      expect(result.allocations[0].amountToInvest).toBe(0);
      expect(result.remainder).toBe(0);
    });

    it('allocates to all groups when all are below range', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 35, deviationThreshold: 3 }),
        makeGroup({ id: 'g2', targetPercentage: 25, deviationThreshold: 3 }),
        makeGroup({ id: 'g3', targetPercentage: 20, deviationThreshold: 3 }),
        makeGroup({ id: 'g4', targetPercentage: 15, deviationThreshold: 3 }),
        makeGroup({ id: 'g5', targetPercentage: 5, deviationThreshold: 3 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1' }),
        makeAsset({ id: 'a2', groupId: 'g2' }),
        makeAsset({ id: 'a3', groupId: 'g3' }),
        makeAsset({ id: 'a4', groupId: 'g4' }),
        makeAsset({ id: 'a5', groupId: 'g5' }),
      ];
      const inputs = [
        makeInput('a1', 36),
        makeInput('a2', 24),
        makeInput('a3', 26),
        makeInput('a4', 14),
        makeInput('a5', 0),
      ];

      const result = calculateAllocations(groups, assets, inputs, 50);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      const a2 = result.allocations.find((a) => a.assetId === 'a2')!;
      const a3 = result.allocations.find((a) => a.assetId === 'a3')!;
      const a4 = result.allocations.find((a) => a.assetId === 'a4')!;
      const a5 = result.allocations.find((a) => a.assetId === 'a5')!;
      expect(a1.amountToInvest).toBeCloseTo(17.9);
      expect(a2.amountToInvest).toBeCloseTo(14.5);
      expect(a3.amountToInvest).toBeCloseTo(0.8);
      expect(a4.amountToInvest).toBeCloseTo(9.1);
      expect(a5.amountToInvest).toBeCloseTo(7.7);
      expect(result.remainder).toBeCloseTo(0);
    });

    it('returns excess as remainder when all groups are capped in Pass 3', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 50, deviationThreshold: 1 }),
        makeGroup({ id: 'g2', targetPercentage: 30, deviationThreshold: 1 }),
        makeGroup({ id: 'g3', targetPercentage: 20, deviationThreshold: 1 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1', type: 'unit' }),
        makeAsset({ id: 'a2', groupId: 'g2', type: 'unit' }),
        makeAsset({ id: 'a3', groupId: 'g3', type: 'unit' }),
      ];
      const inputs = [
        makeInput('a1', 5100, 100000),
        makeInput('a2', 3100, 100000),
        makeInput('a3', 1800, 100000),
      ];

      const result = calculateAllocations(groups, assets, inputs, 1000);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      const a2 = result.allocations.find((a) => a.assetId === 'a2')!;
      const a3 = result.allocations.find((a) => a.assetId === 'a3')!;
      expect(a1.unitsToBuy).toBe(0);
      expect(a1.amountToInvest).toBe(0);
      expect(a2.unitsToBuy).toBe(0);
      expect(a2.amountToInvest).toBe(0);
      expect(a3.amountToInvest).toBe(0);
      expect(a3.unitsToBuy).toBe(0);
      expect(result.remainder).toBeCloseTo(1000);
    });
  });

  describe('per-asset distribution', () => {
    it('handles unit-type assets with floor rounding', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 100, deviationThreshold: 5 }),
      ];
      const assets = [makeAsset({ id: 'a1', groupId: 'g1', type: 'unit' })];
      const inputs = [makeInput('a1', 0, 30)];

      const result = calculateAllocations(groups, assets, inputs, 100);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      expect(a1.unitsToBuy).toBe(3);
      expect(a1.amountToInvest).toBe(90);
      expect(result.remainder).toBeCloseTo(10);
    });

    it('returns null unitsToBuy for fixed-type assets', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 100, deviationThreshold: 5 }),
      ];
      const assets = [makeAsset({ id: 'a1', groupId: 'g1', type: 'fixed' })];
      const inputs = [makeInput('a1', 0)];

      const result = calculateAllocations(groups, assets, inputs, 100);

      expect(result.allocations[0].unitsToBuy).toBeNull();
      expect(result.allocations[0].type).toBe('fixed');
      expect(result.allocations[0].amountToInvest).toBe(100);
    });

    it('skips inactive assets but counts their value', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 100, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1', active: true }),
        makeAsset({ id: 'a2', groupId: 'g1', active: false }),
      ];
      const inputs = [makeInput('a1', 500), makeInput('a2', 500)];

      const result = calculateAllocations(groups, assets, inputs, 200);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      const a2 = result.allocations.find((a) => a.assetId === 'a2')!;
      expect(a1.amountToInvest).toBe(200);
      expect(a2.amountToInvest).toBe(0);
    });

    it('splits group allocation equally among active assets', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 100, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1' }),
        makeAsset({ id: 'a2', groupId: 'g1' }),
      ];
      const inputs = [makeInput('a1', 0), makeInput('a2', 0)];

      const result = calculateAllocations(groups, assets, inputs, 1000);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      const a2 = result.allocations.find((a) => a.assetId === 'a2')!;
      expect(a1.amountToInvest).toBeCloseTo(500);
      expect(a2.amountToInvest).toBeCloseTo(500);
    });

    it('handles mixed unit and fixed assets in the same group', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 100, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1', type: 'unit' }),
        makeAsset({ id: 'a2', groupId: 'g1', type: 'fixed' }),
      ];
      const inputs = [makeInput('a1', 0, 150), makeInput('a2', 0)];

      const result = calculateAllocations(groups, assets, inputs, 1000);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      const a2 = result.allocations.find((a) => a.assetId === 'a2')!;
      expect(a1.unitsToBuy).toBe(3);
      expect(a1.amountToInvest).toBe(450);
      expect(a2.amountToInvest).toBe(550);
      expect(a2.unitsToBuy).toBeNull();
      expect(result.remainder).toBeCloseTo(0);
    });

    it('handles unit-type asset with zero unit price', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 100, deviationThreshold: 5 }),
      ];
      const assets = [makeAsset({ id: 'a1', groupId: 'g1', type: 'unit' })];
      const inputs = [makeInput('a1', 0, 0)];

      const result = calculateAllocations(groups, assets, inputs, 100);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      expect(a1.unitsToBuy).toBe(0);
      expect(a1.amountToInvest).toBe(0);
      expect(result.remainder).toBeCloseTo(100);
    });
  });

  describe('remainder reinvestment', () => {
    it('reinvests unit rounding remainder into group furthest below target', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 70, deviationThreshold: 5 }),
        makeGroup({ id: 'g2', targetPercentage: 30, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1', type: 'unit' }),
        makeAsset({ id: 'a2', groupId: 'g2', type: 'unit' }),
      ];
      const inputs = [makeInput('a1', 50, 40), makeInput('a2', 50, 12)];

      const result = calculateAllocations(groups, assets, inputs, 100);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      const a2 = result.allocations.find((a) => a.assetId === 'a2')!;
      expect(a1.unitsToBuy).toBe(2);
      expect(a1.amountToInvest).toBe(80);
      expect(a2.unitsToBuy).toBe(1);
      expect(a2.amountToInvest).toBe(12);
      expect(result.remainder).toBeCloseTo(8);
    });

    it('distributes unit rounding remainder to fixed assets', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 50, deviationThreshold: 5 }),
        makeGroup({ id: 'g2', targetPercentage: 50, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1', type: 'unit' }),
        makeAsset({ id: 'a2', groupId: 'g2', type: 'fixed' }),
      ];
      const inputs = [makeInput('a1', 0, 30), makeInput('a2', 0)];

      const result = calculateAllocations(groups, assets, inputs, 100);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      const a2 = result.allocations.find((a) => a.assetId === 'a2')!;
      expect(a1.unitsToBuy).toBe(1);
      expect(a1.amountToInvest).toBe(30);
      expect(a2.amountToInvest).toBe(70);
      expect(result.remainder).toBeCloseTo(0);
    });

    it('does not distribute remainder to fixed assets in groups above threshold', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 20, deviationThreshold: 5 }),
        makeGroup({ id: 'g2', targetPercentage: 80, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1', type: 'unit' }),
        makeAsset({ id: 'a2', groupId: 'g2', type: 'fixed' }),
      ];
      const inputs = [makeInput('a1', 0, 30), makeInput('a2', 1000)];

      const result = calculateAllocations(groups, assets, inputs, 100);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      const a2 = result.allocations.find((a) => a.assetId === 'a2')!;
      expect(a1.unitsToBuy).toBeGreaterThan(0);
      expect(result.remainder).toBeGreaterThan(0);
      expect(a2.amountToInvest).toBe(0);
    });

    it('keeps remainder when only unit assets exist', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 100, deviationThreshold: 5 }),
      ];
      const assets = [makeAsset({ id: 'a1', groupId: 'g1', type: 'unit' })];
      const inputs = [makeInput('a1', 0, 30)];

      const result = calculateAllocations(groups, assets, inputs, 100);

      expect(result.allocations[0].unitsToBuy).toBe(3);
      expect(result.allocations[0].amountToInvest).toBe(90);
      expect(result.remainder).toBeCloseTo(10);
    });

    it('reinvests extra units using updated gap after each purchase', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 60, deviationThreshold: 5 }),
        makeGroup({ id: 'g2', targetPercentage: 40, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1', type: 'unit' }),
        makeAsset({ id: 'a2', groupId: 'g2', type: 'unit' }),
      ];
      // g1 gets 60% of 200 = 120 → 1 unit at $100 = $100, remainder $20
      // g2 gets 40% of 200 = 80 → 1 unit at $50 = $50, remainder $30
      // total remainder = $50, enough for 1 more unit of g2 ($50)
      // g1 gap: 60 - (100+100)/(200+200)*100 = 60-50 = 10
      // g2 gap: 40 - (100+50)/(200+200)*100 = 40-37.5 = 2.5
      // g1 has bigger gap so gets the extra unit... but after buying:
      // g1 gap becomes 60 - (100+200)/(400)*100 = 60-75 = -15 (over target)
      // So if there were more remainder, g2 should get the next one
      const inputs = [makeInput('a1', 100, 100), makeInput('a2', 100, 50)];

      const result = calculateAllocations(groups, assets, inputs, 200);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      const a2 = result.allocations.find((a) => a.assetId === 'a2')!;
      // With updated gaps, reinvestment should correctly prioritize
      expect(a1.unitsToBuy).toBeGreaterThanOrEqual(1);
      expect(a2.unitsToBuy).toBeGreaterThanOrEqual(1);
      expect(result.remainder).toBeCloseTo(0);
    });

    it('allocates to mixed unit/fixed assets across groups with unit rounding remainder', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 35, deviationThreshold: 3 }),
        makeGroup({ id: 'g2', targetPercentage: 25, deviationThreshold: 3 }),
        makeGroup({ id: 'g3', targetPercentage: 20, deviationThreshold: 3 }),
        makeGroup({ id: 'g4', targetPercentage: 15, deviationThreshold: 3 }),
        makeGroup({ id: 'g5', targetPercentage: 5, deviationThreshold: 3 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1', type: 'unit' }),
        makeAsset({ id: 'a2', groupId: 'g2' }),
        makeAsset({ id: 'a3', groupId: 'g3' }),
        makeAsset({ id: 'a4', groupId: 'g4', type: 'unit' }),
        makeAsset({ id: 'a5', groupId: 'g5', type: 'unit' }),
      ];
      const inputs = [
        makeInput('a1', 36, 12),
        makeInput('a2', 24),
        makeInput('a3', 26),
        makeInput('a4', 14, 6.5),
        makeInput('a5', 0, 5),
      ];

      const result = calculateAllocations(groups, assets, inputs, 50);

      const a1 = result.allocations.find((a) => a.assetId === 'a1')!;
      const a2 = result.allocations.find((a) => a.assetId === 'a2')!;
      const a3 = result.allocations.find((a) => a.assetId === 'a3')!;
      const a4 = result.allocations.find((a) => a.assetId === 'a4')!;
      const a5 = result.allocations.find((a) => a.assetId === 'a5')!;
      expect(a1.unitsToBuy).toBe(1);
      expect(a1.amountToInvest).toBe(12);
      expect(a2.unitsToBuy).toBeNull();
      expect(a2.amountToInvest).toBeCloseTo(15.17);
      expect(a3.unitsToBuy).toBeNull();
      expect(a3.amountToInvest).toBeCloseTo(1.33);
      expect(a4.unitsToBuy).toBe(1);
      expect(a4.amountToInvest).toBe(6.5);
      expect(a5.unitsToBuy).toBe(3);
      expect(a5.amountToInvest).toBe(15);
      expect(result.remainder).toBeCloseTo(0);
    });
  });

  describe('groupStats', () => {
    it('returns current and after percentages', () => {
      const groups = [
        makeGroup({ id: 'g1', targetPercentage: 60, deviationThreshold: 5 }),
        makeGroup({ id: 'g2', targetPercentage: 40, deviationThreshold: 5 }),
      ];
      const assets = [
        makeAsset({ id: 'a1', groupId: 'g1' }),
        makeAsset({ id: 'a2', groupId: 'g2' }),
      ];
      const inputs = [makeInput('a1', 600), makeInput('a2', 400)];

      const result = calculateAllocations(groups, assets, inputs, 1000);

      const g1Stats = result.groupStats.get('g1')!;
      const g2Stats = result.groupStats.get('g2')!;
      expect(g1Stats.currentPct).toBeCloseTo(60);
      expect(g2Stats.currentPct).toBeCloseTo(40);
      expect(g1Stats.afterPct).toBeCloseTo(60);
      expect(g2Stats.afterPct).toBeCloseTo(40);
    });
  });
});
