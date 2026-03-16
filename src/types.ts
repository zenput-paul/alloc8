export type AssetType = 'unit' | 'fixed'

export interface Group {
  id: string
  name: string
  targetPercentage: number
  deviationThreshold: number
}

export interface Asset {
  id: string
  groupId: string
  name: string
  type: AssetType
  active: boolean
}

export interface Portfolio {
  groups: Group[]
}

export interface AssetInput {
  assetId: string
  currentValue: number
  unitPrice: number
}

export interface AssetAllocation {
  assetId: string
  type: AssetType
  unitsToBuy: number | null
  amountToInvest: number
}

export interface AssetFormValues {
  currentValue: string
  unitPrice: string
}

export interface GroupStats {
  currentPct: number
  afterPct: number
}
