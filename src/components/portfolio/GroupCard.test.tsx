import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupCard } from './GroupCard';
import type { Asset } from '../../types';

const mockAssets: Asset[] = [];
const mockPatch = vi.fn();
const mockRemove = vi.fn();
const mockExec = vi.fn();

vi.mock('rxdb-hooks', () => ({
  useRxCollection: () => ({
    find: () => {},
    findOne: () => ({ exec: mockExec }),
  }),
  useRxQuery: () => ({
    result: mockAssets,
    isFetching: false,
  }),
}));

function setMockAssets(assets: Asset[]) {
  mockAssets.length = 0;
  mockAssets.push(...assets);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockExec.mockResolvedValue({ patch: mockPatch, remove: mockRemove });
  setMockAssets([]);
});

const defaultGroup = {
  id: 'g1',
  name: 'Stocks',
  targetPercentage: 60,
  deviationThreshold: 5,
};

describe('GroupCard', () => {
  it('renders group name and target info', () => {
    render(
      <GroupCard group={defaultGroup} onEdit={() => {}} onDelete={() => {}} />,
    );

    expect(screen.getByText('Stocks')).toBeInTheDocument();
    expect(screen.getByText('Target: 60%')).toBeInTheDocument();
    expect(screen.getByText('Deviation: ±5%')).toBeInTheDocument();
    expect(screen.getByText('0 assets')).toBeInTheDocument();
  });

  it('shows no-active-assets warning when group has no assets at all', () => {
    render(
      <GroupCard group={defaultGroup} onEdit={() => {}} onDelete={() => {}} />,
    );

    expect(screen.getByText(/no active assets/)).toBeInTheDocument();
  });

  it('shows no-active-assets warning when group has no active assets', () => {
    setMockAssets([
      { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: false },
    ]);
    render(
      <GroupCard group={defaultGroup} onEdit={() => {}} onDelete={() => {}} />,
    );

    expect(screen.getByText(/no active assets/)).toBeInTheDocument();
  });

  it('does not show warning when group has an active asset', () => {
    setMockAssets([
      { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
    ]);
    render(
      <GroupCard group={defaultGroup} onEdit={() => {}} onDelete={() => {}} />,
    );

    expect(screen.queryByText(/no active assets/)).not.toBeInTheDocument();
  });

  it('starts expanded when defaultExpanded is true', () => {
    setMockAssets([
      { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
    ]);
    render(
      <GroupCard
        group={defaultGroup}
        onEdit={() => {}}
        onDelete={() => {}}
        defaultExpanded
      />,
    );

    expect(screen.getByText('1 asset')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Add Asset')).toBeInTheDocument();
    expect(
      screen.queryByText(/won't receive new investments/),
    ).not.toBeInTheDocument();
  });

  it('shows assets when expanded', async () => {
    const user = userEvent.setup();
    setMockAssets([
      { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit', active: true },
      {
        id: 'a2',
        groupId: 'g1',
        name: 'Bond Fund',
        type: 'fixed',
        active: false,
      },
    ]);
    render(
      <GroupCard group={defaultGroup} onEdit={() => {}} onDelete={() => {}} />,
    );

    // Expand the card
    const expandButtons = screen.getAllByRole('button');
    const expandButton = expandButtons.find((b) =>
      b.querySelector('[data-testid="ExpandMoreIcon"]'),
    )!;
    await user.click(expandButton);

    expect(screen.getByText('2 assets')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Bond Fund')).toBeInTheDocument();
    // Asset type labels
    expect(screen.getByText('Units')).toBeInTheDocument();
    expect(screen.getByText('Fixed amount')).toBeInTheDocument();
    const switches = screen.getAllByRole('switch');
    // AAPL is active, Bond Fund is inactive
    expect(switches[0]).toBeChecked();
    expect(switches[1]).not.toBeChecked();
    expect(
      screen.getByText(/won't receive new investments/),
    ).toBeInTheDocument();
  });

  it('shows "No assets" when expanded with empty assets', () => {
    render(
      <GroupCard
        group={defaultGroup}
        onEdit={() => {}}
        onDelete={() => {}}
        defaultExpanded
      />,
    );

    expect(
      screen.getByText('No assets yet — add one to get started'),
    ).toBeInTheDocument();
  });

  it('calls onEdit when edit menu item is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <GroupCard group={defaultGroup} onEdit={onEdit} onDelete={() => {}} />,
    );

    // Open the menu
    await user.click(
      screen
        .getAllByRole('button')
        .find((b) => b.querySelector('[data-testid="MoreVertIcon"]'))!,
    );

    await user.click(screen.getByText('Edit'));

    expect(onEdit).toHaveBeenCalledWith(defaultGroup);
  });

  it('calls onDelete when delete menu item is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <GroupCard group={defaultGroup} onEdit={() => {}} onDelete={onDelete} />,
    );

    // Open the menu
    await user.click(
      screen
        .getAllByRole('button')
        .find((b) => b.querySelector('[data-testid="MoreVertIcon"]'))!,
    );

    await user.click(screen.getByText('Delete'));

    expect(onDelete).toHaveBeenCalledWith(defaultGroup);
  });
});
