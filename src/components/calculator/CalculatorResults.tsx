import {
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { Group, Asset, AssetAllocation, GroupStats } from '../../types'
import { formatCurrency, formatUnits } from '../../lib/formatNumber'
import { ON_TARGET_EPSILON } from '../../lib/calculator'

interface CalculatorResultsProps {
  groups: Group[]
  assets: Asset[]
  allocations: AssetAllocation[]
  remainder: number
  groupStats: Map<string, GroupStats>
}

function pctColor(pct: number, target: number, threshold: number): string {
  const deviation = Math.abs(pct - target)
  if (deviation < ON_TARGET_EPSILON) return 'success.main'
  if (deviation <= threshold) return 'warning.main'
  return 'error.main'
}

function pctHint(
  pct: number,
  target: number,
  t: (key: string, opts?: Record<string, string>) => string,
): string {
  const diff = pct - target
  if (Math.abs(diff) < ON_TARGET_EPSILON) return t('calculator.pctOnTarget')
  if (diff > 0) return t('calculator.pctAboveTarget', { value: diff.toFixed(1) })
  return t('calculator.pctBelowTarget', { value: Math.abs(diff).toFixed(1) })
}

export function CalculatorResults({
  groups,
  assets,
  allocations,
  remainder,
  groupStats,
}: CalculatorResultsProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  const allocationMap = new Map(allocations.map(a => [a.assetId, a]))
  const totalAllocated = allocations.reduce((sum, a) => sum + a.amountToInvest, 0)
  const stocksTotal = allocations
    .filter(a => a.type === 'unit')
    .reduce((sum, a) => sum + a.amountToInvest, 0)
  const fixedTotal = allocations
    .filter(a => a.type === 'fixed')
    .reduce((sum, a) => sum + a.amountToInvest, 0)

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                {t('calculator.asset')}
              </TableCell>
              <TableCell align="right" sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                {t('calculator.unitsToBuy')}
              </TableCell>
              <TableCell align="right" sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                {t('calculator.amount')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map(group => {
              const groupAssets = assets.filter(a => a.groupId === group.id)
              const stats = groupStats.get(group.id)
              return [
                <TableRow key={`header-${group.id}`}>
                  <TableCell
                    colSpan={3}
                    sx={{ fontWeight: 'bold', bgcolor: 'action.hover', pb: stats ? 0.5 : undefined }}
                  >
                    {group.name}
                    {stats && (
                      <Typography variant="caption" display="block" sx={{ fontWeight: 'normal', mt: 0.25 }}>
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ color: pctColor(stats.currentPct, group.targetPercentage, group.deviationThreshold) }}
                        >
                          {t('calculator.currentPct', { value: stats.currentPct.toFixed(1) })}
                          {' ('}
                          {pctHint(stats.currentPct, group.targetPercentage, t)}
                          {')'}
                        </Typography>
                        {' → '}
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ color: pctColor(stats.afterPct, group.targetPercentage, group.deviationThreshold) }}
                        >
                          {t('calculator.afterPct', { value: stats.afterPct.toFixed(1) })}
                          {' ('}
                          {pctHint(stats.afterPct, group.targetPercentage, t)}
                          {')'}
                        </Typography>
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>,
                ...groupAssets.map(asset => {
                  const allocation = allocationMap.get(asset.id)
                  if (!allocation) return null
                  return (
                    <TableRow key={asset.id} sx={{ opacity: asset.active ? 1 : 0.4 }}>
                      <TableCell sx={{ pl: 3 }}>{asset.name}</TableCell>
                      <TableCell align="right">
                        {allocation.unitsToBuy !== null
                          ? formatUnits(allocation.unitsToBuy, locale)
                          : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(allocation.amountToInvest, locale)}
                      </TableCell>
                    </TableRow>
                  )
                }),
              ]
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} sx={{ color: 'text.secondary' }}>
                {t('calculator.totalUnits')}
              </TableCell>
              <TableCell align="right" sx={{ color: 'text.secondary' }}>
                {formatCurrency(stocksTotal, locale)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={2} sx={{ color: 'text.secondary' }}>
                {t('calculator.totalFixed')}
              </TableCell>
              <TableCell align="right" sx={{ color: 'text.secondary' }}>
                {formatCurrency(fixedTotal, locale)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={2} sx={{ fontWeight: 'bold', borderBottom: 'none' }}>
                {t('calculator.total')}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', borderBottom: 'none' }}>
                {formatCurrency(totalAllocated, locale)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>

      {remainder > 0.005 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            {t('calculator.remainder', { value: formatCurrency(remainder, locale) })}
          </Typography>
        </Alert>
      )}
    </>
  )
}
