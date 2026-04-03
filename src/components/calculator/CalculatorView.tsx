import { useEffect, useRef } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CalculatorInputForm } from './CalculatorInputForm';
import { CalculatorResults } from './CalculatorResults';
import { useCalculator } from './useCalculator';

export function CalculatorView() {
  const { t } = useTranslation();
  const resultsRef = useRef<HTMLDivElement>(null);

  const calc = useCalculator();
  const ready = !calc.isFetching && calc.hasData;

  useEffect(() => {
    if (calc.result) {
      resultsRef.current?.scrollIntoView?.({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [calc.result]);

  return (
    <Container
      maxWidth={false}
      sx={{
        mt: 2,
        mb: 2,
        maxWidth: (theme) => ({
          xs: theme.breakpoints.values.sm,
          md: theme.breakpoints.values.lg,
        }),
      }}
    >
      <Stack spacing={2}>
        {calc.isFetching && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!calc.isFetching && !calc.hasData && (
          <Typography
            color="text.secondary"
            sx={{ textAlign: 'center', mt: 4 }}
          >
            {t('calculator.emptyState')}
          </Typography>
        )}

        {ready && !calc.percentagesValid && (
          <Alert severity="warning">{t('calculator.percentageError')}</Alert>
        )}
        {ready && calc.percentagesValid && !calc.allGroupsHaveActiveAssets && (
          <Alert severity="warning">
            {t('calculator.noActiveAssetsError')}
          </Alert>
        )}
        {calc.error && <Alert severity="error">{calc.error}</Alert>}

        {ready && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 3,
              alignItems: 'flex-start',
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              <Typography variant="h6" gutterBottom>
                {t('calculator.investmentDetails')}
              </Typography>
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
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, width: '100%' }} ref={resultsRef}>
              <Typography variant="h6" gutterBottom>
                {t('calculator.allocationResults')}
              </Typography>
              {calc.result ? (
                <CalculatorResults
                  groups={calc.groups}
                  assets={calc.assets}
                  allocations={calc.displayAllocations}
                  remainder={calc.displayRemainder}
                  groupStats={calc.groupStats}
                />
              ) : (
                <Typography
                  color="text.secondary"
                  sx={{ textAlign: 'center', mt: 4 }}
                >
                  {t('calculator.noResults')}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
