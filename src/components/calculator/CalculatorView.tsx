import { useEffect, useRef } from 'react'
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { CalculatorInputForm } from './CalculatorInputForm'
import { CalculatorResults } from './CalculatorResults'
import { useCalculator } from './useCalculator'

export function CalculatorView() {
  const { t } = useTranslation()
  const theme = useTheme()
  const isWide = useMediaQuery(theme.breakpoints.up('md'))
  const resultsRef = useRef<HTMLDivElement>(null)

  const calc = useCalculator()

  useEffect(() => {
    if (calc.result) {
      resultsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    }
  }, [calc.result])

  const alerts = (
    <>
      {!calc.isFetching && calc.hasData && !calc.percentagesValid && (
        <Alert severity="warning">{t('calculator.percentageError')}</Alert>
      )}
      {!calc.isFetching && calc.hasData && calc.percentagesValid && !calc.allGroupsHaveActiveAssets && (
        <Alert severity="warning">{t('calculator.noActiveAssetsError')}</Alert>
      )}
      {calc.error && <Alert severity="error">{calc.error}</Alert>}
    </>
  )

  const inputForm = !calc.isFetching && calc.hasData && (
    <CalculatorInputForm
      groups={calc.groups}
      assets={calc.assets}
      assetInputs={calc.assetInputs}
      totalInvestment={calc.totalInvestment}
      onAssetInputChange={calc.handleAssetInputChange}
      onTotalInvestmentChange={calc.handleTotalInvestmentChange}
      onCalculate={calc.handleCalculate}
      onReset={calc.handleReset}
      isValid={calc.isValid}
      hasResult={calc.result !== null}
    />
  )

  const resultsPanel = !calc.isFetching && calc.hasData && (
    <Box ref={resultsRef}>
      <CalculatorResults
        groups={calc.groups}
        assets={calc.assets}
        allocations={calc.displayAllocations}
        remainder={calc.displayRemainder}
        groupStats={calc.groupStats}
      />
    </Box>
  )

  if (isWide) {
    return (
      <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        <Stack spacing={2}>
          {calc.isFetching && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {!calc.isFetching && !calc.hasData && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
              {t('calculator.emptyState')}
            </Typography>
          )}

          {alerts}

          <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>{inputForm}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>{resultsPanel}</Box>
          </Box>
        </Stack>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 2, mb: 2 }}>
      <Stack spacing={2}>
        {calc.isFetching && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!calc.isFetching && !calc.hasData && (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            {t('calculator.emptyState')}
          </Typography>
        )}

        {alerts}
        {inputForm}
        {resultsPanel}
      </Stack>
    </Container>
  )
}
