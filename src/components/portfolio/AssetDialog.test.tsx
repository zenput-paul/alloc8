import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssetDialog } from './AssetDialog'

const mockInsert = vi.fn()
const mockPatch = vi.fn()
const mockExec = vi.fn()

vi.mock('rxdb-hooks', () => ({
  useRxCollection: () => ({
    insert: mockInsert,
    findOne: () => ({ exec: mockExec }),
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockExec.mockResolvedValue({ patch: mockPatch })
})

describe('AssetDialog', () => {
  it('renders add mode with empty name and unit type selected', () => {
    render(<AssetDialog open onClose={() => {}} groupId="g1" />)

    expect(screen.getByText('Add Asset')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Stocks (units)', pressed: true })).toBeInTheDocument()
  })

  it('renders edit mode with pre-filled fields', () => {
    const asset = { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit' as const, active: true }
    render(<AssetDialog open onClose={() => {}} groupId="g1" editItem={asset} />)

    expect(screen.getByText('Edit Asset')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('AAPL')
  })

  it('shows validation error for empty name', async () => {
    const user = userEvent.setup()
    render(<AssetDialog open onClose={() => {}} groupId="g1" />)

    await user.click(screen.getByText('Add'))

    expect(screen.getByLabelText('Name')).toBeInvalid()
    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('inserts a new unit asset and closes', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AssetDialog open onClose={onClose} groupId="g1" />)

    await user.type(screen.getByLabelText('Name'), 'AAPL')
    await user.click(screen.getByText('Add'))

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: 'g1',
        name: 'AAPL',
        type: 'unit',
        active: true,
      }),
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('switches type to fixed before inserting', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AssetDialog open onClose={onClose} groupId="g1" />)

    await user.type(screen.getByLabelText('Name'), 'Treasury Bond')
    await user.click(screen.getByRole('button', { name: 'Fixed amount' }))
    await user.click(screen.getByText('Add'))

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'fixed' }),
    )
  })

  it('patches an existing asset in edit mode', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const asset = { id: 'a1', groupId: 'g1', name: 'AAPL', type: 'unit' as const, active: true }
    render(<AssetDialog open onClose={onClose} groupId="g1" editItem={asset} />)

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'GOOGL')
    await user.click(screen.getByRole('button', { name: 'Fixed amount' }))
    await user.click(screen.getByText('Save'))

    expect(mockPatch).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'GOOGL', type: 'fixed' }),
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AssetDialog open onClose={onClose} groupId="g1" />)

    await user.click(screen.getByText('Cancel'))

    expect(onClose).toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
