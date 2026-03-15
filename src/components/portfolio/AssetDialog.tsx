import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  TextField,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
} from '@mui/material'
import { useRxCollection } from 'rxdb-hooks'
import type { Asset, AssetType } from '../../types'

interface AssetDialogProps {
  open: boolean
  onClose: () => void
  groupId: string
  editItem?: Asset
}

export function AssetDialog({ open, onClose, groupId, editItem }: AssetDialogProps) {
  // Key changes each time the dialog opens, remounting the form to reset state
  const [formKey, setFormKey] = useState(0)

  function handleClose() {
    onClose()
    setFormKey(k => k + 1)
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <AssetDialogForm
        key={formKey}
        onClose={handleClose}
        groupId={groupId}
        editItem={editItem}
      />
    </Dialog>
  )
}

interface AssetDialogFormProps {
  onClose: () => void
  groupId: string
  editItem?: Asset
}

function AssetDialogForm({ onClose, groupId, editItem }: AssetDialogFormProps) {
  const collection = useRxCollection<Asset>('assets')
  const [name, setName] = useState(editItem?.name ?? '')
  const [type, setType] = useState<AssetType>(editItem?.type ?? 'unit')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Name is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSave() {
    if (!validate() || !collection) return

    if (editItem) {
      const doc = await collection.findOne(editItem.id).exec()
      await doc?.patch({ name: name.trim(), type })
    } else {
      await collection.insert({
        id: crypto.randomUUID(),
        groupId,
        name: name.trim(),
        type,
        active: true,
      })
    }

    onClose()
  }

  return (
    <form onSubmit={e => { e.preventDefault(); handleSave() }}>
      <DialogTitle>{editItem ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            autoFocus
            fullWidth
          />
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Type
            </Typography>
            <ToggleButtonGroup
              value={type}
              exclusive
              onChange={(_, v) => { if (v) setType(v as AssetType) }}
              fullWidth
              size="small"
            >
              <ToggleButton value="unit">Stocks (units)</ToggleButton>
              <ToggleButton value="fixed">Fixed amount</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained">
          {editItem ? 'Save' : 'Add'}
        </Button>
      </DialogActions>
    </form>
  )
}
