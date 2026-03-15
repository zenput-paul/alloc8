import { Container, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

export function CalculatorView() {
  const { t } = useTranslation()

  return (
    <Container maxWidth="sm" sx={{ mt: 2 }}>
      <Typography variant="h5">{t('calculator.title')}</Typography>
    </Container>
  )
}
