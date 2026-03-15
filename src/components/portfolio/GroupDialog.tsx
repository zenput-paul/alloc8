import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  InputAdornment,
} from '@mui/material'
import { useRxCollection } from 'rxdb-hooks'
import type { Group } from '../../types'

interface GroupDialogProps {
  open: boolean
  onClose: () => void
  editItem?: Group
}

export function GroupDialog({ open, onClose, editItem }: GroupDialogProps) {
  const [formKey, setFormKey] = useState(0)

  function handleClose() {
    onClose()
    setFormKey(k => k + 1)
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <GroupDialogForm key={formKey} onClose={handleClose} editItem={editItem} />
    </Dialog>
  )
}

interface GroupDialogFormProps {
  onClose: () => void
  editItem?: Group
}

function GroupDialogForm({ onClose, editItem }: GroupDialogFormProps) {
  const collection = useRxCollection<Group>('groups')
  const [name, setName] = useState(editItem?.name ?? '')
  const [targetPercentage, setTargetPercentage] = useState(
    editItem ? String(editItem.targetPercentage) : '',
  )
  const [deviationThreshold, setDeviationThreshold] = useState(
    editItem ? String(editItem.deviationThreshold) : '',
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Name is required'
    const pct = Number(targetPercentage)
    if (!targetPercentage.trim() || isNaN(pct) || pct <= 0) newErrors.targetPercentage = 'Must be a number > 0'
    const dev = Number(deviationThreshold)
    if (!deviationThreshold.trim() || isNaN(dev) || dev < 0) newErrors.deviationThreshold = 'Must be a number >= 0'
    if (!newErrors.targetPercentage && !newErrors.deviationThreshold && dev >= pct) newErrors.deviationThreshold = 'Must be less than target'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSave() {
    if (!validate() || !collection) return

    const data = {
      name: name.trim(),
      targetPercentage: Number(targetPercentage),
      deviationThreshold: Number(deviationThreshold),
    }

    if (editItem) {
      const doc = await collection.findOne(editItem.id).exec()
      await doc?.patch(data)
    } else {
      await collection.insert({ id: crypto.randomUUID(), ...data })
    }

    onClose()
  }

  return (
    <form onSubmit={e => { e.preventDefault(); handleSave() }}>
      <DialogTitle>{editItem ? 'Edit Group' : 'Add Group'}</DialogTitle>
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
          <TextField
            label="Target"
            type="number"
            value={targetPercentage}
            onChange={e => setTargetPercentage(e.target.value)}
            error={!!errors.targetPercentage}
            helperText={errors.targetPercentage}
            slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
            fullWidth
          />
          <TextField
            label="Deviation Threshold"
            type="number"
            value={deviationThreshold}
            onChange={e => setDeviationThreshold(e.target.value)}
            error={!!errors.deviationThreshold}
            helperText={errors.deviationThreshold}
            slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
            fullWidth
          />
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
