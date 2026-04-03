export const groupSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    targetPercentage: { type: 'number' },
    deviationThreshold: { type: 'number' },
  },
  required: ['id', 'name', 'targetPercentage', 'deviationThreshold'],
} as const;
