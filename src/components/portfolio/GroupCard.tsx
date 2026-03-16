import { useState } from 'react'
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Button,
  Stack,
  Switch,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { useRxCollection, useRxQuery } from 'rxdb-hooks'
import { useTranslation } from 'react-i18next'
import type { Group, Asset } from '../../types'
import { AssetDialog } from './AssetDialog'

interface GroupCardProps {
  group: Group
  onEdit: (group: Group) => void
  onDelete: (group: Group) => void
  defaultExpanded?: boolean
}

export function GroupCard({ group, onEdit, onDelete, defaultExpanded = false }: GroupCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [assetDialogOpen, setAssetDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>()
  const [deletingAsset, setDeletingAsset] = useState<Asset | undefined>()
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const { t } = useTranslation()

  const assetsCollection = useRxCollection<Asset>('assets')
  const query = assetsCollection?.find({ selector: { groupId: group.id } })
  const { result: assets, isFetching } = useRxQuery(query)

  const hasActiveAsset = assets.some(a => a.active)

  async function handleToggleActive(asset: Asset) {
    const doc = await assetsCollection?.findOne(asset.id).exec()
    await doc?.patch({ active: !asset.active })
  }

  async function handleConfirmDeleteAsset() {
    if (!deletingAsset) return
    const doc = await assetsCollection?.findOne(deletingAsset.id).exec()
    await doc?.remove()
    setDeletingAsset(undefined)
  }

  function handleEditAsset(asset: Asset) {
    setEditingAsset(asset)
    setAssetDialogOpen(true)
  }

  function handleAddAsset() {
    setEditingAsset(undefined)
    setAssetDialogOpen(true)
  }

  function AssetActions({ asset }: { asset: Asset }) {
    return (
      <>
        <Switch
          size="small"
          checked={asset.active}
          onChange={() => handleToggleActive(asset)}
        />
        <IconButton size="small" onClick={() => handleEditAsset(asset)} aria-label={t('group.edit')}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => setDeletingAsset(asset)} aria-label={t('group.delete')}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </>
    )
  }

  return (
    <>
      <Card variant="outlined">
        <CardContent sx={{ pb: expanded ? 0 : undefined }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6">{group.name}</Typography>
              <Stack direction="row" spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  {t('group.target', { value: group.targetPercentage })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('group.deviation', { value: group.deviationThreshold })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('group.assetCount', { count: assets.length })}
                </Typography>
              </Stack>
            </Box>
            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)} aria-label={t('group.options')}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
              <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
                <MenuItem onClick={() => { setMenuAnchor(null); onEdit(group) }}>
                  <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                  {t('group.edit')}
                </MenuItem>
                <MenuItem onClick={() => { setMenuAnchor(null); onDelete(group) }}>
                  <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
                  {t('group.delete')}
                </MenuItem>
              </Menu>
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                aria-label={t('group.expand')}
                sx={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            </Stack>
          </Stack>
          {!isFetching && !hasActiveAsset && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {t('group.noActiveAssets')}
            </Alert>
          )}
        </CardContent>
        <Collapse in={expanded}>
          <List dense>
            {assets.map(asset => (
              <ListItem key={asset.id} secondaryAction={<AssetActions asset={asset} />}>
                <ListItemText
                  primary={asset.name}
                  secondary={asset.type === 'unit' ? t('assetDialog.units') : t('assetDialog.fixedAmount')}
                  sx={{ opacity: asset.active ? 1 : 0.5 }}
                />
              </ListItem>
            ))}
            {assets.length === 0 && (
              <ListItem>
                <ListItemText
                  primary={t('group.noAssetsYet')}
                  sx={{ color: 'text.secondary', fontStyle: 'italic' }}
                />
              </ListItem>
            )}
          </List>
          {assets.some(a => !a.active) && (
            <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 1, display: 'block' }}>
              {t('group.inactiveHint')}
            </Typography>
          )}
          <CardActions>
            <Button size="small" startIcon={<AddIcon />} onClick={handleAddAsset}>
              {t('group.addAsset')}
            </Button>
          </CardActions>
        </Collapse>
      </Card>

      <Dialog open={!!deletingAsset} onClose={() => setDeletingAsset(undefined)}>
        <DialogTitle>{t('group.deleteAssetTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('group.deleteAssetConfirm', { name: deletingAsset?.name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeletingAsset(undefined)}>{t('group.cancel')}</Button>
          <Button onClick={handleConfirmDeleteAsset} color="error" variant="contained">
            {t('group.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <AssetDialog
        open={assetDialogOpen}
        onClose={() => setAssetDialogOpen(false)}
        groupId={group.id}
        editItem={editingAsset}
      />
    </>
  )
}
