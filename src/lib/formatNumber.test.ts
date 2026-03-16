import { formatCurrency, formatUnits } from './formatNumber'

describe('formatCurrency', () => {
  it('formats with two decimal places in English', () => {
    expect(formatCurrency(1234.5, 'en')).toBe('1,234.50')
  })

  it('formats with two decimal places in Spanish', () => {
    expect(formatCurrency(1234.5, 'es-MX')).toBe('1,234.50')
  })

  it('formats zero', () => {
    expect(formatCurrency(0, 'en')).toBe('0.00')
  })

  it('rounds to two decimals', () => {
    expect(formatCurrency(99.999, 'en')).toBe('100.00')
  })

  it('formats negative numbers', () => {
    expect(formatCurrency(-1234.5, 'en')).toBe('-1,234.50')
  })

  it('formats very large numbers', () => {
    expect(formatCurrency(999999999.99, 'en')).toBe('999,999,999.99')
  })

  it('rounds very small decimals below half-cent to zero cents', () => {
    expect(formatCurrency(0.001, 'en')).toBe('0.00')
  })

  it('rounds very small decimals near one cent', () => {
    expect(formatCurrency(0.009, 'en')).toBe('0.01')
  })
})

describe('formatUnits', () => {
  it('formats whole numbers in English', () => {
    expect(formatUnits(1234, 'en')).toBe('1,234')
  })

  it('formats whole numbers in Spanish', () => {
    expect(formatUnits(1234, 'es-MX')).toBe('1,234')
  })

  it('formats zero', () => {
    expect(formatUnits(0, 'en')).toBe('0')
  })

  it('rounds to whole number', () => {
    expect(formatUnits(5.7, 'en')).toBe('6')
  })

  it('formats negative numbers', () => {
    expect(formatUnits(-1234, 'en')).toBe('-1,234')
  })

  it('formats very large numbers', () => {
    expect(formatUnits(999999999, 'en')).toBe('999,999,999')
  })
})
