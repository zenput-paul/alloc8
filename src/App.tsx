import { useState } from 'react'
import { Container, Typography, Button, Box, Stack } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Container maxWidth="sm">
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h3" gutterBottom>
          Vite + React + MUI
        </Typography>
        <Stack spacing={2} alignItems="center">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCount((count) => count + 1)}
          >
            Count is {count}
          </Button>
          <Typography variant="body1" color="text.secondary">
            Edit <code>src/App.tsx</code> and save to test HMR
          </Typography>
        </Stack>
      </Box>
    </Container>
  )
}

export default App
