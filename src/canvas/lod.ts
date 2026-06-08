import { LOD_SIMPLIFIED, LOD_RECT_ONLY } from '../lib/constants'

export type LODLevel = 'full' | 'simplified' | 'rect'

export function getLOD(zoom: number): LODLevel {
  if (zoom < LOD_RECT_ONLY) return 'rect'
  if (zoom < LOD_SIMPLIFIED) return 'simplified'
  return 'full'
}
