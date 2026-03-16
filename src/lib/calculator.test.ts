import { calculateAllocations } from "./calculator";
import type { Group, Asset, AssetInput } from "../types";

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
    type: "fixed",
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

describe("calculateAllocations", () => {
  it("distributes proportionally to target percentages from zero", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 60, deviationThreshold: 5 }),
      makeGroup({ id: "g2", targetPercentage: 40, deviationThreshold: 5 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1" }),
      makeAsset({ id: "a2", groupId: "g2" }),
    ];
    const inputs = [makeInput("a1", 0), makeInput("a2", 0)];

    const result = calculateAllocations(groups, assets, inputs, 1000);

    const a1 = result.allocations.find((a) => a.assetId === "a1")!;
    const a2 = result.allocations.find((a) => a.assetId === "a2")!;
    expect(a1.amountToInvest).toBeCloseTo(600);
    expect(a2.amountToInvest).toBeCloseTo(400);
  });

  it("prioritizes below-range groups", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 50, deviationThreshold: 2 }),
      makeGroup({ id: "g2", targetPercentage: 50, deviationThreshold: 2 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1" }),
      makeAsset({ id: "a2", groupId: "g2" }),
    ];
    // g1=300 (25% of 1200), g2=700 (58.3% of 1200). Target=50% each.
    // g1 is below range (25% < 48%), g2 is above range (58.3% > 52%).
    // Pass 1: g1 gets all 200 (capped at target value 600 - current 300 = 300).
    // Pass 2: g2 is over threshold, so no remaining distribution.
    const inputs = [makeInput("a1", 300), makeInput("a2", 700)];

    const result = calculateAllocations(groups, assets, inputs, 200);

    const a1 = result.allocations.find((a) => a.assetId === "a1")!;
    const a2 = result.allocations.find((a) => a.assetId === "a2")!;
    expect(a1.amountToInvest).toBeCloseTo(200);
    expect(a2.amountToInvest).toBeCloseTo(0);
  });

  it("prioritizes below-range groups but still allocates to others", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 60, deviationThreshold: 5 }),
      makeGroup({ id: "g2", targetPercentage: 40, deviationThreshold: 5 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1" }),
      makeAsset({ id: "a2", groupId: "g2" }),
    ];
    // g1=400 (33.3% of 1200), g2=400 (33.3% of 1200). Targets: 60%, 40%.
    // g1 is below range (33.3% < 55%), g2 is within range (35%-45%).
    // Pass 1: g1 gets 320 (capped at target value 720 - current 400).
    // Pass 2: 80 remaining → g2 is under cap (33.3% < 45%), gets 80.
    const inputs = [makeInput("a1", 400), makeInput("a2", 400)];

    const result = calculateAllocations(groups, assets, inputs, 400);

    const a1 = result.allocations.find((a) => a.assetId === "a1")!;
    const a2 = result.allocations.find((a) => a.assetId === "a2")!;
    expect(a1.amountToInvest).toBeCloseTo(320);
    expect(a2.amountToInvest).toBeCloseTo(80);
  });

  it("handles unit-type assets with floor rounding", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 100, deviationThreshold: 5 }),
    ];
    const assets = [makeAsset({ id: "a1", groupId: "g1", type: "unit" })];
    const inputs = [makeInput("a1", 0, 30)];

    const result = calculateAllocations(groups, assets, inputs, 100);

    const a1 = result.allocations.find((a) => a.assetId === "a1")!;
    expect(a1.unitsToBuy).toBe(3);
    expect(a1.amountToInvest).toBe(90);
    expect(result.remainder).toBeCloseTo(10);
  });

  it("returns null unitsToBuy for fixed-type assets", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 100, deviationThreshold: 5 }),
    ];
    const assets = [makeAsset({ id: "a1", groupId: "g1", type: "fixed" })];
    const inputs = [makeInput("a1", 0)];

    const result = calculateAllocations(groups, assets, inputs, 100);

    expect(result.allocations[0].unitsToBuy).toBeNull();
    expect(result.allocations[0].type).toBe("fixed");
    expect(result.allocations[0].amountToInvest).toBe(100);
  });

  it("skips inactive assets but counts their value", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 100, deviationThreshold: 5 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1", active: true }),
      makeAsset({ id: "a2", groupId: "g1", active: false }),
    ];
    const inputs = [makeInput("a1", 500), makeInput("a2", 500)];

    const result = calculateAllocations(groups, assets, inputs, 200);

    const a1 = result.allocations.find((a) => a.assetId === "a1")!;
    const a2 = result.allocations.find((a) => a.assetId === "a2")!;
    expect(a1.amountToInvest).toBe(200);
    expect(a2.amountToInvest).toBe(0);
  });

  it("returns groupStats with current and after percentages", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 60, deviationThreshold: 5 }),
      makeGroup({ id: "g2", targetPercentage: 40, deviationThreshold: 5 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1" }),
      makeAsset({ id: "a2", groupId: "g2" }),
    ];
    const inputs = [makeInput("a1", 600), makeInput("a2", 400)];

    const result = calculateAllocations(groups, assets, inputs, 1000);

    const g1Stats = result.groupStats.get("g1")!;
    const g2Stats = result.groupStats.get("g2")!;
    // Current: g1=600/1000=60%, g2=400/1000=40%
    expect(g1Stats.currentPct).toBeCloseTo(60);
    expect(g2Stats.currentPct).toBeCloseTo(40);
    // After: total=2000, allocations are proportional so percentages stay ~60/40
    expect(g1Stats.afterPct).toBeCloseTo(60);
    expect(g2Stats.afterPct).toBeCloseTo(40);
  });

  it("returns zero allocations for zero investment", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 100, deviationThreshold: 5 }),
    ];
    const assets = [makeAsset({ id: "a1", groupId: "g1" })];
    const inputs = [makeInput("a1", 100)];

    const result = calculateAllocations(groups, assets, inputs, 0);

    expect(result.allocations[0].amountToInvest).toBe(0);
    expect(result.remainder).toBe(0);
  });

  it("throws when a group has no active assets", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 50, deviationThreshold: 5 }),
      makeGroup({ id: "g2", targetPercentage: 50, deviationThreshold: 5 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1", active: false }),
      makeAsset({ id: "a2", groupId: "g2", active: true }),
    ];
    const inputs = [makeInput("a1", 100), makeInput("a2", 100)];

    expect(() => calculateAllocations(groups, assets, inputs, 100)).toThrow(
      'Group "Group g1" has no active assets',
    );
  });

  it("splits group allocation equally among active assets", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 100, deviationThreshold: 5 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1" }),
      makeAsset({ id: "a2", groupId: "g1" }),
    ];
    const inputs = [makeInput("a1", 0), makeInput("a2", 0)];

    const result = calculateAllocations(groups, assets, inputs, 1000);

    const a1 = result.allocations.find((a) => a.assetId === "a1")!;
    const a2 = result.allocations.find((a) => a.assetId === "a2")!;
    expect(a1.amountToInvest).toBeCloseTo(500);
    expect(a2.amountToInvest).toBeCloseTo(500);
  });

  it("handles mixed unit and fixed assets in the same group", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 100, deviationThreshold: 5 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1", type: "unit" }),
      makeAsset({ id: "a2", groupId: "g1", type: "fixed" }),
    ];
    const inputs = [makeInput("a1", 0, 150), makeInput("a2", 0)];

    const result = calculateAllocations(groups, assets, inputs, 1000);

    const a1 = result.allocations.find((a) => a.assetId === "a1")!;
    const a2 = result.allocations.find((a) => a.assetId === "a2")!;
    expect(a1.unitsToBuy).toBe(3); // floor(500/150)
    expect(a1.amountToInvest).toBe(450);
    expect(a2.amountToInvest).toBe(550); // 500 initial + 50 remainder from unit rounding
    expect(a2.unitsToBuy).toBeNull();
    expect(result.remainder).toBeCloseTo(0);
  });

  it("allocates to all groups when all are below range", () => {
    // 5 groups, g5 is brand new (no holdings)
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 35, deviationThreshold: 3 }),
      makeGroup({ id: "g2", targetPercentage: 25, deviationThreshold: 3 }),
      makeGroup({ id: "g3", targetPercentage: 20, deviationThreshold: 3 }),
      makeGroup({ id: "g4", targetPercentage: 15, deviationThreshold: 3 }),
      makeGroup({ id: "g5", targetPercentage: 5, deviationThreshold: 3 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1" }),
      makeAsset({ id: "a2", groupId: "g2" }),
      makeAsset({ id: "a3", groupId: "g3" }),
      makeAsset({ id: "a4", groupId: "g4" }),
      makeAsset({ id: "a5", groupId: "g5" }),
    ];
    // Total current=100, invest=50, future=150.
    // g1=24%<32%, g2=16%<22%, g4=9.3%<12%, g5=0%<2% → all below range.
    // g3=17.3% is within range (17-23%).
    // Pass 1: below-range groups get priority, capped at target value.
    //   g1=16.5, g2=13.5, g4=8.5, g5=7.5 (total=46). Remaining=4.
    // Pass 2: remaining 4 distributed to all groups proportional to target%.
    //   g1+=1.4, g2+=1.0, g3+=0.8, g4+=0.6, g5+=0.2.
    const inputs = [
      makeInput("a1", 36),
      makeInput("a2", 24),
      makeInput("a3", 26),
      makeInput("a4", 14),
      makeInput("a5", 0),
    ];

    const result = calculateAllocations(groups, assets, inputs, 50);

    const a1 = result.allocations.find((a) => a.assetId === "a1")!;
    const a2 = result.allocations.find((a) => a.assetId === "a2")!;
    const a3 = result.allocations.find((a) => a.assetId === "a3")!;
    const a4 = result.allocations.find((a) => a.assetId === "a4")!;
    const a5 = result.allocations.find((a) => a.assetId === "a5")!;
    expect(a1.amountToInvest).toBeCloseTo(17.9); // 16.5 + 1.4
    expect(a2.amountToInvest).toBeCloseTo(14.5); // 13.5 + 1.0
    expect(a3.amountToInvest).toBeCloseTo(0.8); // 0 + 0.8 (within range, pass 2 only)
    expect(a4.amountToInvest).toBeCloseTo(9.1); // 8.5 + 0.6
    expect(a5.amountToInvest).toBeCloseTo(7.7); // 7.5 + 0.2
    expect(result.remainder).toBeCloseTo(0);
  });

  it("allocates to mixed unit/fixed assets across groups with unit rounding remainder", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 35, deviationThreshold: 3 }),
      makeGroup({ id: "g2", targetPercentage: 25, deviationThreshold: 3 }),
      makeGroup({ id: "g3", targetPercentage: 20, deviationThreshold: 3 }),
      makeGroup({ id: "g4", targetPercentage: 15, deviationThreshold: 3 }),
      makeGroup({ id: "g5", targetPercentage: 5, deviationThreshold: 3 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1", type: "unit" }),
      makeAsset({ id: "a2", groupId: "g2" }), // fixed
      makeAsset({ id: "a3", groupId: "g3" }), // fixed
      makeAsset({ id: "a4", groupId: "g4", type: "unit" }),
      makeAsset({ id: "a5", groupId: "g5", type: "unit" }),
    ];
    // Same allocation math as previous test: g1≈17.9, g2≈14.5, g3≈0.8, g4≈9.1, g5≈7.7.
    // Initial rounding: g1=1 unit(12), g4=1 unit(6.5), g5=1 unit(5). Remainder=11.2.
    // Remainder reinvestment: g5 is furthest below target gap, cheapest unit.
    //   Buy a5 (5) → remainder=6.2. Buy a5 again (5) → remainder=1.2.
    //   1.2 < cheapest unit (5), stop. a5 ends with 3 units.
    const inputs = [
      makeInput("a1", 36, 12),
      makeInput("a2", 24),
      makeInput("a3", 26),
      makeInput("a4", 14, 6.5),
      makeInput("a5", 0, 5),
    ];

    const result = calculateAllocations(groups, assets, inputs, 50);

    const a1 = result.allocations.find((a) => a.assetId === "a1")!;
    const a2 = result.allocations.find((a) => a.assetId === "a2")!;
    const a3 = result.allocations.find((a) => a.assetId === "a3")!;
    const a4 = result.allocations.find((a) => a.assetId === "a4")!;
    const a5 = result.allocations.find((a) => a.assetId === "a5")!;
    expect(a1.unitsToBuy).toBe(1);
    expect(a1.amountToInvest).toBe(12);
    expect(a2.unitsToBuy).toBeNull();
    expect(a2.amountToInvest).toBeCloseTo(15.17); // 14.5 + 1.2 * (25/45)
    expect(a3.unitsToBuy).toBeNull();
    expect(a3.amountToInvest).toBeCloseTo(1.33); // 0.8 + 1.2 * (20/45)
    expect(a4.unitsToBuy).toBe(1);
    expect(a4.amountToInvest).toBe(6.5);
    expect(a5.unitsToBuy).toBe(3);
    expect(a5.amountToInvest).toBe(15);
    expect(result.remainder).toBeCloseTo(0);
  });

  it("reinvests unit rounding remainder into group furthest below target", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 70, deviationThreshold: 5 }),
      makeGroup({ id: "g2", targetPercentage: 30, deviationThreshold: 5 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1", type: "unit" }),
      makeAsset({ id: "a2", groupId: "g2", type: "unit" }),
    ];
    // g1=50 (25% of 200), below range (<65%). g2=50 (25%), within range (25-35%).
    // Pass 1: g1 gets 90 (capped at target value 140-50). Remaining=10.
    // Pass 2: remaining 10 split proportionally — g1+=7, g2+=3.
    // Initial rounding: a1 price=40, floor(97/40)=2, spent=80, leftover=17.
    //                   a2 price=12, floor(3/12)=0, spent=0, leftover=3.
    // Remainder=20. g2 gap=3.5 > g1 gap=-3.5, so a2 gets priority.
    // Buy a2 (12) → remainder=8. 8 < 12 (cheapest), stop.
    const inputs = [makeInput("a1", 50, 40), makeInput("a2", 50, 12)];

    const result = calculateAllocations(groups, assets, inputs, 100);

    const a1 = result.allocations.find((a) => a.assetId === "a1")!;
    const a2 = result.allocations.find((a) => a.assetId === "a2")!;
    expect(a1.unitsToBuy).toBe(2);
    expect(a1.amountToInvest).toBe(80);
    expect(a2.unitsToBuy).toBe(1);        // 0 from initial + 1 from remainder
    expect(a2.amountToInvest).toBe(12);
    expect(result.remainder).toBeCloseTo(8);
  });

  it("caps groups that exceed target + threshold", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 80, deviationThreshold: 5 }),
      makeGroup({ id: "g2", targetPercentage: 20, deviationThreshold: 5 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1" }),
      makeAsset({ id: "a2", groupId: "g2" }),
    ];
    // g1=900 (81.8% of 1100), g2=100 (9.1% of 1100). Targets: 80%, 20%.
    // g2 is below range (9.1% < 15%), gets priority.
    // Pass 1: g2 gets all 100 (deficit=10.9, capped at target value 220-100=120).
    // g1 is above target but within threshold, gets nothing.
    const inputs = [makeInput("a1", 900), makeInput("a2", 100)];

    const result = calculateAllocations(groups, assets, inputs, 100);

    const a1 = result.allocations.find((a) => a.assetId === "a1")!;
    const a2 = result.allocations.find((a) => a.assetId === "a2")!;
    expect(a1.amountToInvest).toBeCloseTo(0);
    expect(a2.amountToInvest).toBeCloseTo(100);
  });

  it("throws when a group has target percentage of 0%", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 0, deviationThreshold: 5 }),
      makeGroup({ id: "g2", targetPercentage: 100, deviationThreshold: 5 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1" }),
      makeAsset({ id: "a2", groupId: "g2" }),
    ];
    const inputs = [makeInput("a1", 0), makeInput("a2", 0)];

    expect(() => calculateAllocations(groups, assets, inputs, 100)).toThrow(
      'Group "Group g1" has a target percentage of 0% or less',
    );
  });

  it("throws when group target percentages do not total 100%", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 60, deviationThreshold: 5 }),
      makeGroup({ id: "g2", targetPercentage: 30, deviationThreshold: 5 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1" }),
      makeAsset({ id: "a2", groupId: "g2" }),
    ];
    const inputs = [makeInput("a1", 0), makeInput("a2", 0)];

    expect(() => calculateAllocations(groups, assets, inputs, 100)).toThrow(
      "Group target percentages total 90%, must equal 100%",
    );
  });

  it("throws when a group has deviation threshold >= target percentage", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 5, deviationThreshold: 10 }),
      makeGroup({ id: "g2", targetPercentage: 95, deviationThreshold: 5 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1" }),
      makeAsset({ id: "a2", groupId: "g2" }),
    ];
    const inputs = [makeInput("a1", 0), makeInput("a2", 0)];

    expect(() => calculateAllocations(groups, assets, inputs, 100)).toThrow(
      'Group "Group g1" has a deviation threshold >= its target percentage',
    );
  });

  it("throws when a group has no assets at all", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 100, deviationThreshold: 5 }),
    ];

    expect(() => calculateAllocations(groups, [], [], 1000)).toThrow(
      'Group "Group g1" has no active assets',
    );
  });

  it("distributes unit rounding remainder to fixed assets", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 50, deviationThreshold: 5 }),
      makeGroup({ id: "g2", targetPercentage: 50, deviationThreshold: 5 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1", type: "unit" }),
      makeAsset({ id: "a2", groupId: "g2", type: "fixed" }),
    ];
    // g1 gets 50, floor(50/30)=1 unit=30, leftover=20.
    // g2 gets 50 as fixed. Remainder=20, goes to a2 (only fixed asset).
    const inputs = [makeInput("a1", 0, 30), makeInput("a2", 0)];

    const result = calculateAllocations(groups, assets, inputs, 100);

    const a1 = result.allocations.find((a) => a.assetId === "a1")!;
    const a2 = result.allocations.find((a) => a.assetId === "a2")!;
    expect(a1.unitsToBuy).toBe(1);
    expect(a1.amountToInvest).toBe(30);
    expect(a2.amountToInvest).toBe(70); // 50 initial + 20 remainder
    expect(result.remainder).toBeCloseTo(0);
  });

  it("does not distribute remainder to fixed assets in groups above threshold", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 20, deviationThreshold: 5 }),
      makeGroup({ id: "g2", targetPercentage: 80, deviationThreshold: 5 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1", type: "unit" }),
      makeAsset({ id: "a2", groupId: "g2", type: "fixed" }),
    ];
    // g2 current=900 (81.8% of 1100), already above 80%+5%=85%? No, 81.8% < 85%.
    // Let's make g2 clearly above threshold:
    // g1=0 (0% of 1100), g2=1000 (90.9% of 1100). g2 target+threshold=85%.
    // g2 is above threshold, so remainder should NOT go to a2.
    const inputs = [makeInput("a1", 0, 30), makeInput("a2", 1000)];

    const result = calculateAllocations(groups, assets, inputs, 100);

    const a1 = result.allocations.find((a) => a.assetId === "a1")!;
    const a2 = result.allocations.find((a) => a.assetId === "a2")!;
    // g1 is far below range, gets most investment. a1 unit price=30.
    // Any remainder from unit rounding should NOT go to a2 (g2 is over threshold).
    expect(a1.unitsToBuy).toBeGreaterThan(0);
    expect(result.remainder).toBeGreaterThan(0);
    // a2's allocation should not include any remainder redistribution
    expect(a2.amountToInvest).toBe(0);
  });

  it("keeps remainder when only unit assets exist", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 100, deviationThreshold: 5 }),
    ];
    const assets = [makeAsset({ id: "a1", groupId: "g1", type: "unit" })];
    const inputs = [makeInput("a1", 0, 30)];

    const result = calculateAllocations(groups, assets, inputs, 100);

    expect(result.allocations[0].unitsToBuy).toBe(3);
    expect(result.allocations[0].amountToInvest).toBe(90);
    expect(result.remainder).toBeCloseTo(10);
  });

  it("handles unit-type asset with zero unit price", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 100, deviationThreshold: 5 }),
    ];
    const assets = [makeAsset({ id: "a1", groupId: "g1", type: "unit" })];
    const inputs = [makeInput("a1", 0, 0)];

    const result = calculateAllocations(groups, assets, inputs, 100);

    const a1 = result.allocations.find((a) => a.assetId === "a1")!;
    expect(a1.unitsToBuy).toBe(0);
    expect(a1.amountToInvest).toBe(0);
    expect(result.remainder).toBeCloseTo(100);
  });

  it("throws for negative totalInvestment", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 60, deviationThreshold: 5 }),
      makeGroup({ id: "g2", targetPercentage: 40, deviationThreshold: 5 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1" }),
      makeAsset({ id: "a2", groupId: "g2" }),
    ];
    const inputs = [makeInput("a1", 100), makeInput("a2", 100)];

    expect(() => calculateAllocations(groups, assets, inputs, -500)).toThrow(
      "Total investment must not be negative",
    );
  });

  it("throws for NaN totalInvestment", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 100, deviationThreshold: 5 }),
    ];
    const assets = [makeAsset({ id: "a1", groupId: "g1" })];
    const inputs = [makeInput("a1", 100)];

    expect(() => calculateAllocations(groups, assets, inputs, NaN)).toThrow(
      "Total investment must be a finite number",
    );
  });

  it("throws for Infinity totalInvestment", () => {
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 100, deviationThreshold: 5 }),
    ];
    const assets = [makeAsset({ id: "a1", groupId: "g1" })];
    const inputs = [makeInput("a1", 100)];

    expect(() => calculateAllocations(groups, assets, inputs, Infinity)).toThrow(
      "Total investment must be a finite number",
    );
  });

  it("returns excess as remainder when all groups are capped in Pass 3", () => {
    // Three groups already near their caps. A large investment relative to remaining
    // cap space forces Pass 2 to over-allocate, then Pass 3 caps every group.
    // With no under-cap groups left, excess flows to remainder.
    const groups = [
      makeGroup({ id: "g1", targetPercentage: 50, deviationThreshold: 1 }),
      makeGroup({ id: "g2", targetPercentage: 30, deviationThreshold: 1 }),
      makeGroup({ id: "g3", targetPercentage: 20, deviationThreshold: 1 }),
    ];
    const assets = [
      makeAsset({ id: "a1", groupId: "g1", type: "unit" }),
      makeAsset({ id: "a2", groupId: "g2", type: "unit" }),
      makeAsset({ id: "a3", groupId: "g3", type: "unit" }),
    ];
    // Total current = 9000, invest = 1000, futureTotal = 10000.
    // g1: 4500/10000 = 45%, below range (< 49%). Target value = 5000. Max alloc = 500.
    // g2: 2700/10000 = 27%, below range (< 29%). Target value = 3000. Max alloc = 300.
    // g3: 1800/10000 = 18%, below range (< 19%). Target value = 2000. Max alloc = 200.
    // Pass 1: all below range. Total deficit = (50-45)+(30-27)+(20-18) = 5+3+2 = 10.
    //   g1 share = (5/10)*1000 = 500, capped at 500. g2 share = 300, capped at 300.
    //   g3 share = 200, capped at 200. Total = 1000. Remaining = 0.
    // Pass 2: remaining = 0, nothing to distribute.
    // Pass 3: g1 at (4500+500)/10000 = 50%, cap = 51%. Fine.
    //   g2 at (2700+300)/10000 = 30%, cap = 31%. Fine.
    //   g3 at (1800+200)/10000 = 20%, cap = 21%. Fine.
    // No capping needed here either. Need groups already ABOVE target.
    //
    // New approach: groups are already at or above their target+threshold before
    // investing, so any allocation immediately exceeds the cap.
    // g1 current = 5100 (51% of 10000), cap = 51%. Already at cap.
    // g2 current = 3100 (31%), cap = 31%. Already at cap.
    // g3 current = 1800 (18%), below range (< 19%).
    // Pass 1: only g3 is below range. Deficit = 20-18 = 2%. Share = 1000.
    //   Target value for g3 = 2000. Max alloc = 200. g3 gets 200. Remaining = 800.
    // Pass 2: check eligible (< target+threshold after alloc).
    //   g1: 5100/10000=51%, cap=51%. NOT eligible (not strictly <).
    //   g2: 3100/10000=31%, cap=31%. NOT eligible.
    //   g3: (1800+200)/10000=20%, cap=21%. Eligible. Gets 800.
    // Pass 3: g3 at (1800+200+800)/10000=28%, cap=21%. Over cap!
    //   maxAlloc = (21%*10000)-1800 = 300. Excess = 1000-300 = 700.
    //   underCap: g1 at 51% >= 51%, no. g2 at 31% >= 31%, no. None under cap.
    //   excess → remainder. remaining = 700.
    // Unit prices are very high so remainder reinvestment buys nothing.
    const inputs = [
      makeInput("a1", 5100, 100000),
      makeInput("a2", 3100, 100000),
      makeInput("a3", 1800, 100000),
    ];

    const result = calculateAllocations(groups, assets, inputs, 1000);

    const a1 = result.allocations.find((a) => a.assetId === "a1")!;
    const a2 = result.allocations.find((a) => a.assetId === "a2")!;
    const a3 = result.allocations.find((a) => a.assetId === "a3")!;
    // g1 and g2 are already at their caps, receive nothing
    expect(a1.unitsToBuy).toBe(0);
    expect(a1.amountToInvest).toBe(0);
    expect(a2.unitsToBuy).toBe(0);
    expect(a2.amountToInvest).toBe(0);
    // g3 is capped at (21% * 10000) - 1800 = 300
    expect(a3.amountToInvest).toBe(0); // unit price 100000 >> 300, so 0 units bought
    expect(a3.unitsToBuy).toBe(0);
    // The unallocatable excess ends up as remainder: 1000 - 300 = 700,
    // plus the 300 that couldn't buy any units
    expect(result.remainder).toBeCloseTo(1000);
  });
});
