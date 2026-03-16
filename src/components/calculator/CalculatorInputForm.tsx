import {
  Box,
  Button,
  Card,
  CardContent,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CalculateIcon from '@mui/icons-material/Calculate'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { useTranslation } from 'react-i18next'
import type { Group, Asset } from '../../types'
import type { AssetFormValues } from './useCalculator'

interface CalculatorInputFormProps {
  groups: Group[]
  assets: Asset[]
  assetInputs: Record<string, AssetFormValues>
  totalInvestment: string
  onAssetInputChange: (assetId: string, field: keyof AssetFormValues, value: string) => void
  onTotalInvestmentChange: (value: string) => void
  onCalculate: () => void
  onReset: () => void
  isValid: boolean
  hasResult: boolean
}

export function CalculatorInputForm({
  groups,
  assets,
  assetInputs,
  totalInvestment,
  onAssetInputChange,
  onTotalInvestmentChange,
  onCalculate,
  onReset,
  isValid,
  hasResult,
}: CalculatorInputFormProps) {
  const { t } = useTranslation()

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        onCalculate()
      }}
    >
      <Stack spacing={2}>
        <TextField
          label={t('calculator.totalInvestment')}
          type="number"
          fullWidth
          required
          inputProps={{ min: 0, step: 'any' }}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          value={totalInvestment}
          onChange={e => onTotalInvestmentChange(e.target.value)}
        />

        {groups.map(group => {
          const groupAssets = assets.filter(a => a.groupId === group.id)
          return (
            <Card key={group.id} variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  {group.name}
                  <Typography component="span" variant="caption" sx={{ ml: 1, fontWeight: 'normal' }}>
                    ({group.targetPercentage}%)
                  </Typography>
                </Typography>
                <Stack spacing={2}>
                  {groupAssets.map(asset => {
                    const inputs = assetInputs[asset.id] ?? { currentValue: '', unitPrice: '' }
                    return (
                      <Box key={asset.id}>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          {asset.name}
                          {!asset.active && (
                            <Typography component="span" variant="caption" sx={{ ml: 1 }}>
                              ({t('calculator.inactive')})
                            </Typography>
                          )}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <TextField
                            label={t('calculator.currentValue')}
                            type="number"
                            size="small"
                            fullWidth
                            required
                            inputProps={{ min: 0, step: 'any' }}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            value={inputs.currentValue}
                            onChange={e => onAssetInputChange(asset.id, 'currentValue', e.target.value)}
                          />
                          {asset.type === 'unit' && (
                            <TextField
                              label={t('calculator.unitPrice')}
                              type="number"
                              size="small"
                              fullWidth
                              required={asset.active}
                              inputProps={{ min: 0, step: 'any' }}
                              value={inputs.unitPrice}
                              onChange={e => onAssetInputChange(asset.id, 'unitPrice', e.target.value)}
                              disabled={!asset.active}
                            />
                          )}
                        </Stack>
                      </Box>
                    )
                  })}
                </Stack>
              </CardContent>
            </Card>
          )
        })}

        <Stack direction="row" spacing={1}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            startIcon={<CalculateIcon />}
            disabled={!isValid}
            fullWidth
          >
            {t('calculator.calculate')}
          </Button>
          {hasResult && (
            <Button
              type="button"
              variant="outlined"
              size="large"
              startIcon={<RestartAltIcon />}
              onClick={onReset}
            >
              {t('calculator.reset')}
            </Button>
          )}
        </Stack>
      </Stack>
    </form>
  )
}
