export const assetSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    groupId: { type: 'string', ref: 'groups', maxLength: 100 },
    name: { type: 'string' },
    type: { type: 'string', enum: ['unit', 'fixed'] },
    active: { type: 'boolean' },
  },
  required: ['id', 'groupId', 'name', 'type', 'active'],
  indexes: ['groupId'],
} as const;
