import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalculatorInputForm } from './CalculatorInputForm';
import type { Group, Asset } from '../../types';
import type { AssetFormValues } from './useCalculator';

const groups: Group[] = [
  { id: 'g1', name: 'Stocks', targetPercentage: 60, deviationThreshold: 5 },
  { id: 'g2', name: 'Bonds', targetPercentage: 40, deviationThreshold: 3 },
];

const assets: Asset[] = [
  { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
  { id: 'a2', groupId: 'g1', name: 'Old Stock', type: 'unit', active: false },
  { id: 'a3', groupId: 'g2', name: 'Treasury', type: 'fixed', active: true },
];

const defaultProps = {
  groups,
  assets,
  assetInputs: {} as Record<string, AssetFormValues>,
  totalInvestment: '',
  onAssetInputChange: vi.fn(),
  onTotalInvestmentChange: vi.fn(),
  onCalculate: vi.fn(),
  onReset: vi.fn(),
  isValid: false,
  hasResult: false,
};

describe('CalculatorInputForm', () => {
  it('renders group names as section headers', () => {
    render(<CalculatorInputForm {...defaultProps} />);
    expect(screen.getByText('Stocks')).toBeInTheDocument();
    expect(screen.getByText('Bonds')).toBeInTheDocument();
  });

  it('renders asset names', () => {
    render(<CalculatorInputForm {...defaultProps} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Treasury')).toBeInTheDocument();
  });

  it('shows inactive label for inactive assets', () => {
    render(<CalculatorInputForm {...defaultProps} />);
    expect(screen.getByText('(Inactive)')).toBeInTheDocument();
  });

  it('renders current value field for all assets as required', () => {
    render(<CalculatorInputForm {...defaultProps} />);
    const currentValueFields = screen.getAllByLabelText(/Current Value/);
    expect(currentValueFields).toHaveLength(3);
    for (const field of currentValueFields) {
      expect(field).toBeRequired();
    }
  });

  it('renders unit price field only for unit-type assets', () => {
    render(<CalculatorInputForm {...defaultProps} />);
    const unitPriceFields = screen.getAllByLabelText(/Unit Price/);
    // Two unit-type assets (AAPL + Old Stock)
    expect(unitPriceFields).toHaveLength(2);
  });

  it('shows the amount to invest field as required', () => {
    render(<CalculatorInputForm {...defaultProps} />);
    const field = screen.getByLabelText(/Amount to Invest/);
    expect(field).toBeInTheDocument();
    expect(field).toBeRequired();
  });

  it('marks unit price as required for active assets and not for inactive', () => {
    render(<CalculatorInputForm {...defaultProps} />);
    const unitPriceFields = screen.getAllByLabelText(/Unit Price/);
    // AAPL (active) should be required, Old Stock (inactive) should not
    const aaplPrice = unitPriceFields[0];
    const oldStockPrice = unitPriceFields[1];
    expect(aaplPrice).toBeRequired();
    expect(oldStockPrice).not.toBeRequired();
  });

  it('disables calculate button when isValid is false', () => {
    render(<CalculatorInputForm {...defaultProps} isValid={false} />);
    expect(screen.getByRole('button', { name: /Calculate/ })).toBeDisabled();
  });

  it('enables calculate button when isValid is true', () => {
    render(<CalculatorInputForm {...defaultProps} isValid={true} />);
    expect(screen.getByRole('button', { name: /Calculate/ })).toBeEnabled();
  });

  it('calls onCalculate when form is submitted', async () => {
    const onCalculate = vi.fn();
    const filledInputs: Record<string, AssetFormValues> = {
      a1: { currentValue: '100', unitPrice: '50' },
      a2: { currentValue: '100', unitPrice: '' },
      a3: { currentValue: '100', unitPrice: '' },
    };
    render(
      <CalculatorInputForm
        {...defaultProps}
        isValid={true}
        assetInputs={filledInputs}
        totalInvestment="1000"
        onCalculate={onCalculate}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Calculate/ }));
    expect(onCalculate).toHaveBeenCalledOnce();
  });

  it('calls onTotalInvestmentChange when investment field changes', async () => {
    const onTotalInvestmentChange = vi.fn();
    render(
      <CalculatorInputForm
        {...defaultProps}
        onTotalInvestmentChange={onTotalInvestmentChange}
      />,
    );

    await userEvent.type(screen.getByLabelText(/Amount to Invest/), '5000');
    expect(onTotalInvestmentChange).toHaveBeenCalled();
  });

  it('shows target percentage in group headers', () => {
    render(<CalculatorInputForm {...defaultProps} />);
    expect(screen.getByText('(60%)')).toBeInTheDocument();
    expect(screen.getByText('(40%)')).toBeInTheDocument();
  });

  it('shows $ adornment on current value and investment fields', () => {
    render(<CalculatorInputForm {...defaultProps} />);
    // 3 current value fields + 1 investment field = 4
    expect(screen.getAllByText('$')).toHaveLength(4);
  });

  it('does not show reset button when there is no result', () => {
    render(<CalculatorInputForm {...defaultProps} hasResult={false} />);
    expect(
      screen.queryByRole('button', { name: /Reset/ }),
    ).not.toBeInTheDocument();
  });

  it('shows reset button when there is a result', () => {
    render(<CalculatorInputForm {...defaultProps} hasResult={true} />);
    expect(screen.getByRole('button', { name: /Reset/ })).toBeInTheDocument();
  });

  it('calls onReset when reset button is clicked', async () => {
    const onReset = vi.fn();
    render(
      <CalculatorInputForm
        {...defaultProps}
        hasResult={true}
        onReset={onReset}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Reset/ }));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
