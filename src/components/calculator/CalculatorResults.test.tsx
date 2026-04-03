import { render, screen } from '@testing-library/react';
import { CalculatorResults } from './CalculatorResults';
import type { Group, Asset, AssetAllocation, GroupStats } from '../../types';

const groups: Group[] = [
  { id: 'g1', name: 'Stocks', targetPercentage: 60, deviationThreshold: 5 },
  { id: 'g2', name: 'Bonds', targetPercentage: 40, deviationThreshold: 3 },
];

const assets: Asset[] = [
  { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
  { id: 'a2', groupId: 'g2', name: 'Treasury', type: 'fixed', active: true },
];

const allocations: AssetAllocation[] = [
  { assetId: 'a1', type: 'unit', unitsToBuy: 3, amountToInvest: 600 },
  { assetId: 'a2', type: 'fixed', unitsToBuy: null, amountToInvest: 400 },
];

const groupStats: Map<string, GroupStats> = new Map([
  ['g1', { currentPct: 66.7, afterPct: 60.0 }],
  ['g2', { currentPct: 33.3, afterPct: 40.0 }],
]);

const defaultProps = { groups, assets, allocations, remainder: 0, groupStats };

describe('CalculatorResults', () => {
  it('renders group headers', () => {
    render(<CalculatorResults {...defaultProps} />);
    expect(screen.getByText('Stocks')).toBeInTheDocument();
    expect(screen.getByText('Bonds')).toBeInTheDocument();
  });

  it('renders asset names in the table', () => {
    render(<CalculatorResults {...defaultProps} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Treasury')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<CalculatorResults {...defaultProps} />);
    expect(screen.getByText('Asset')).toBeInTheDocument();
    expect(screen.getByText('Units to Buy')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  it('shows units to buy for unit-type assets', () => {
    render(<CalculatorResults {...defaultProps} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows dash for fixed-type assets in units column', () => {
    render(<CalculatorResults {...defaultProps} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('formats amounts as currency', () => {
    render(<CalculatorResults {...defaultProps} />);
    // 600.00 appears for AAPL row and stocks subtotal
    expect(screen.getAllByText('600.00')).toHaveLength(2);
    // 400.00 appears for Treasury row and fixed subtotal
    expect(screen.getAllByText('400.00')).toHaveLength(2);
  });

  it('shows subtotals by asset type', () => {
    render(<CalculatorResults {...defaultProps} />);
    expect(screen.getByText('Units subtotal')).toBeInTheDocument();
    expect(screen.getByText('Fixed subtotal')).toBeInTheDocument();
  });

  it('shows current and after percentages in group headers', () => {
    render(<CalculatorResults {...defaultProps} />);
    expect(screen.getByText(/Current: 66\.7%/)).toBeInTheDocument();
    expect(screen.getByText(/After: 60\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/Current: 33\.3%/)).toBeInTheDocument();
    expect(screen.getByText(/After: 40\.0%/)).toBeInTheDocument();
  });

  it('shows +deviation when above target', () => {
    // Stocks: target 60% — current 66.7%, diff=+6.7
    render(<CalculatorResults {...defaultProps} />);
    expect(screen.getByText(/\+6\.7%/)).toBeInTheDocument();
  });

  it('shows -deviation when below target', () => {
    // Bonds: target 40% — current 33.3%, diff=-6.7
    render(<CalculatorResults {...defaultProps} />);
    expect(screen.getByText(/-6\.7%/)).toBeInTheDocument();
  });

  it('shows on target when at target', () => {
    // Stocks: after 60.0% = target 60%
    render(<CalculatorResults {...defaultProps} />);
    // Both groups land on target after investment
    expect(screen.getAllByText(/on target/)).toHaveLength(2);
  });

  it('shows remainder alert when remainder > 0', () => {
    render(<CalculatorResults {...defaultProps} remainder={12.5} />);
    expect(screen.getByText(/12.50/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not show remainder alert when remainder is 0', () => {
    render(<CalculatorResults {...defaultProps} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a total row summing all amounts', () => {
    render(<CalculatorResults {...defaultProps} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    // 600 + 400 = 1000
    expect(screen.getByText('1,000.00')).toBeInTheDocument();
  });

  it('does not show remainder alert when remainder is 0.004 (below threshold)', () => {
    render(<CalculatorResults {...defaultProps} remainder={0.004} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows remainder alert when remainder is 0.006 (above threshold)', () => {
    render(<CalculatorResults {...defaultProps} remainder={0.006} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows "on target" when percentage is 0.04% away from target (within epsilon)', () => {
    const stats = new Map<string, GroupStats>([
      ['g1', { currentPct: 60.04, afterPct: 60.0 }],
      ['g2', { currentPct: 40.0, afterPct: 40.0 }],
    ]);
    render(<CalculatorResults {...defaultProps} groupStats={stats} />);
    // All four hints (current + after for both groups) should say "on target"
    expect(screen.getAllByText(/on target/)).toHaveLength(4);
  });

  it('shows deviation hint when percentage is 0.06% away from target (outside epsilon)', () => {
    const stats = new Map<string, GroupStats>([
      ['g1', { currentPct: 60.06, afterPct: 60.0 }],
      ['g2', { currentPct: 40.0, afterPct: 40.0 }],
    ]);
    render(<CalculatorResults {...defaultProps} groupStats={stats} />);
    // g1 current should show "+0.1%" (0.06 rounds to 0.1 in toFixed(1)), not "on target"
    expect(screen.getByText(/\+0\.1%/)).toBeInTheDocument();
    // The other three hints should still say "on target"
    expect(screen.getAllByText(/on target/)).toHaveLength(3);
  });

  it('does not break when an asset has no matching allocation', () => {
    const assetsWithExtra: Asset[] = [
      ...assets,
      {
        id: 'a99',
        groupId: 'g1',
        name: 'NoAlloc Fund',
        type: 'unit',
        active: true,
      },
    ];
    render(<CalculatorResults {...defaultProps} assets={assetsWithExtra} />);
    // The asset with no allocation should not appear in the table
    expect(screen.queryByText('NoAlloc Fund')).not.toBeInTheDocument();
    // Existing assets still render correctly
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Treasury')).toBeInTheDocument();
  });

  it('dims inactive asset rows', () => {
    const assetsWithInactive: Asset[] = [
      { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
      {
        id: 'a3',
        groupId: 'g1',
        name: 'Old Fund',
        type: 'unit',
        active: false,
      },
      {
        id: 'a2',
        groupId: 'g2',
        name: 'Treasury',
        type: 'fixed',
        active: true,
      },
    ];
    const allocsWithInactive: AssetAllocation[] = [
      { assetId: 'a1', type: 'unit', unitsToBuy: 3, amountToInvest: 600 },
      { assetId: 'a3', type: 'unit', unitsToBuy: 0, amountToInvest: 0 },
      { assetId: 'a2', type: 'fixed', unitsToBuy: null, amountToInvest: 400 },
    ];
    render(
      <CalculatorResults
        {...defaultProps}
        assets={assetsWithInactive}
        allocations={allocsWithInactive}
      />,
    );
    const oldFundRow = screen.getByText('Old Fund').closest('tr')!;
    expect(oldFundRow).toHaveStyle({ opacity: '0.4' });
  });
});
