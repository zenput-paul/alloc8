import { useState } from 'react'
import {
  Container,
  Stack,
  Button,
  Alert,
  Typography,
  CircularProgress,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useRxCollection, useRxQuery } from 'rxdb-hooks'
import type { Group, Asset } from '../../types'
import { GroupCard } from './GroupCard'
import { GroupDialog } from './GroupDialog'

export function PortfolioView() {
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | undefined>()
  const [deletingGroup, setDeletingGroup] = useState<Group | undefined>()

  const groupsCollection = useRxCollection<Group>('groups')
  const assetsCollection = useRxCollection<Asset>('assets')
  const groupsQuery = groupsCollection?.find()
  const { result: groups, isFetching: groupsFetching } = useRxQuery(groupsQuery)
  const assetsQuery = assetsCollection?.find()
  const { result: allAssets, isFetching: assetsFetching } = useRxQuery(assetsQuery)

  const totalPercentage = groups.reduce((sum, g) => sum + g.targetPercentage, 0)

  function groupHasActiveAsset(groupId: string): boolean {
    return allAssets.some(a => a.groupId === groupId && a.active)
  }

  function handleAddGroup() {
    setEditingGroup(undefined)
    setGroupDialogOpen(true)
  }

  function handleEditGroup(group: Group) {
    setEditingGroup(group)
    setGroupDialogOpen(true)
  }

  async function handleConfirmDeleteGroup() {
    if (!deletingGroup) return
    // Delete assets belonging to this group first
    const assets = await assetsCollection
      ?.find({ selector: { groupId: deletingGroup.id } })
      .exec()
    if (assets) {
      await Promise.all(assets.map(asset => asset.remove()))
    }
    const doc = await groupsCollection?.findOne(deletingGroup.id).exec()
    await doc?.remove()
    setDeletingGroup(undefined)
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 2, mb: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Portfolio</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddGroup}
            size="small"
          >
            Add Group
          </Button>
        </Stack>

        {groups.length > 0 && totalPercentage !== 100 && (
          <Alert severity="warning">
            Group percentages total {totalPercentage}% — must equal 100%.
          </Alert>
        )}

        {groups.map(group => (
          <GroupCard
            key={`${group.id}-${assetsFetching}`}
            group={group}
            onEdit={handleEditGroup}
            onDelete={setDeletingGroup}
            defaultExpanded={!assetsFetching && !groupHasActiveAsset(group.id)}
          />
        ))}

        {groupsFetching && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!groupsFetching && groups.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No groups yet. Add a group to get started.
          </Typography>
        )}
      </Stack>

      <Dialog open={!!deletingGroup} onClose={() => setDeletingGroup(undefined)}>
        <DialogTitle>Delete Group</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{deletingGroup?.name}" and all its assets?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeletingGroup(undefined)}>Cancel</Button>
          <Button onClick={handleConfirmDeleteGroup} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <GroupDialog
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        editItem={editingGroup}
      />
    </Container>
  )
}
