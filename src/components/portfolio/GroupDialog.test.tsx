import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupDialog } from './GroupDialog';

const mockInsert = vi.fn();
const mockPatch = vi.fn();
const mockExec = vi.fn();

vi.mock('rxdb-hooks', () => ({
  useRxCollection: () => ({
    insert: mockInsert,
    findOne: () => ({ exec: mockExec }),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockExec.mockResolvedValue({ patch: mockPatch });
});

describe('GroupDialog', () => {
  it('renders add mode with empty fields', () => {
    render(<GroupDialog open onClose={() => {}} />);

    expect(screen.getByText('Add Group')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Target')).toHaveValue(null);
    expect(screen.getByLabelText('Deviation Threshold')).toHaveValue(null);
  });

  it('renders edit mode with pre-filled fields', () => {
    const group = {
      id: 'g1',
      name: 'Stocks',
      targetPercentage: 60,
      deviationThreshold: 5,
    };
    render(<GroupDialog open onClose={() => {}} editItem={group} />);

    expect(screen.getByText('Edit Group')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Stocks');
    expect(screen.getByLabelText('Target')).toHaveValue(60);
    expect(screen.getByLabelText('Deviation Threshold')).toHaveValue(5);
  });

  it('shows validation errors for empty name', async () => {
    const user = userEvent.setup();
    render(<GroupDialog open onClose={() => {}} />);

    await user.type(screen.getByLabelText('Target'), '50');
    await user.type(screen.getByLabelText('Deviation Threshold'), '5');
    await user.click(screen.getByText('Add'));

    expect(screen.getByLabelText('Name')).toBeInvalid();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('shows validation error for target percentage of 0', async () => {
    const user = userEvent.setup();
    render(<GroupDialog open onClose={() => {}} />);

    await user.type(screen.getByLabelText('Name'), 'Stocks');
    await user.type(screen.getByLabelText('Target'), '0');
    await user.type(screen.getByLabelText('Deviation Threshold'), '5');
    await user.click(screen.getByText('Add'));

    expect(screen.getByLabelText('Target')).toBeInvalid();
    expect(screen.getByText('Must be a number > 0')).toBeInTheDocument();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('shows validation error for negative deviation threshold', async () => {
    const user = userEvent.setup();
    render(<GroupDialog open onClose={() => {}} />);

    await user.type(screen.getByLabelText('Name'), 'Stocks');
    await user.type(screen.getByLabelText('Target'), '50');
    await user.clear(screen.getByLabelText('Deviation Threshold'));
    await user.type(screen.getByLabelText('Deviation Threshold'), '-1');
    await user.click(screen.getByText('Add'));

    expect(screen.getByLabelText('Deviation Threshold')).toBeInvalid();
    expect(screen.getByText('Must be a number >= 0')).toBeInTheDocument();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('shows validation error when deviation threshold >= target', async () => {
    const user = userEvent.setup();
    render(<GroupDialog open onClose={() => {}} />);

    await user.type(screen.getByLabelText('Name'), 'Stocks');
    await user.type(screen.getByLabelText('Target'), '5');
    await user.type(screen.getByLabelText('Deviation Threshold'), '10');
    await user.click(screen.getByText('Add'));

    expect(screen.getByLabelText('Deviation Threshold')).toBeInvalid();
    expect(screen.getByText('Must be less than target')).toBeInTheDocument();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('shows all validation errors when submitting with all fields empty', async () => {
    const user = userEvent.setup();
    render(<GroupDialog open onClose={() => {}} />);

    await user.click(screen.getByText('Add'));

    expect(screen.getByLabelText('Name')).toBeInvalid();
    expect(screen.getByLabelText('Target')).toBeInvalid();
    expect(screen.getByLabelText('Deviation Threshold')).toBeInvalid();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Must be a number > 0')).toBeInTheDocument();
    expect(screen.getByText('Must be a number >= 0')).toBeInTheDocument();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('shows validation error for empty target percentage', async () => {
    const user = userEvent.setup();
    render(<GroupDialog open onClose={() => {}} />);

    await user.type(screen.getByLabelText('Name'), 'Stocks');
    await user.type(screen.getByLabelText('Deviation Threshold'), '5');
    await user.click(screen.getByText('Add'));

    expect(screen.getByLabelText('Target')).toBeInvalid();
    expect(screen.getByText('Must be a number > 0')).toBeInTheDocument();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('shows validation error for empty deviation threshold', async () => {
    const user = userEvent.setup();
    render(<GroupDialog open onClose={() => {}} />);

    await user.type(screen.getByLabelText('Name'), 'Stocks');
    await user.type(screen.getByLabelText('Target'), '50');
    await user.click(screen.getByText('Add'));

    expect(screen.getByLabelText('Deviation Threshold')).toBeInvalid();
    expect(screen.getByText('Must be a number >= 0')).toBeInTheDocument();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('inserts a new group and closes on valid submit', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<GroupDialog open onClose={onClose} />);

    await user.type(screen.getByLabelText('Name'), 'Bonds');
    await user.type(screen.getByLabelText('Target'), '40');
    await user.type(screen.getByLabelText('Deviation Threshold'), '3');
    await user.click(screen.getByText('Add'));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Bonds',
        targetPercentage: 40,
        deviationThreshold: 3,
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('patches an existing group in edit mode', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const group = {
      id: 'g1',
      name: 'Stocks',
      targetPercentage: 60,
      deviationThreshold: 5,
    };
    render(<GroupDialog open onClose={onClose} editItem={group} />);

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Equities');
    await user.clear(screen.getByLabelText('Target'));
    await user.type(screen.getByLabelText('Target'), '70');
    await user.clear(screen.getByLabelText('Deviation Threshold'));
    await user.type(screen.getByLabelText('Deviation Threshold'), '10');
    await user.click(screen.getByText('Save'));

    expect(mockPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Equities',
        targetPercentage: 70,
        deviationThreshold: 10,
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<GroupDialog open onClose={onClose} />);

    await user.click(screen.getByText('Cancel'));

    expect(onClose).toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
