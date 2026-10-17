export type Tier = 'safe' | 'review'
export type Category = 'Code projects' | 'AI models' | 'Package caches' | 'SDKs' | 'Documents' | 'Home'
export type ScanStatus = 'idle' | 'loading' | 'ready' | 'error'
export type CandidateId = 'npm-cache' | 'next-output' | 'gradle-cache' | 'xcode-derived' | 'browser-cache' | 'android' | 'ollama-models' | 'node-modules' | 'docker-volumes'

export interface FolderNode {
  id: string
  name: string
  path: string
  size: number
  category: Category
  candidate?: CandidateId
  children?: FolderNode[]
}
export interface RecommendationItem {
  id: CandidateId
  label: string
  tier: Tier
  size: number
  paths: string[]
  note: string
}
export interface SkippedFolder { path: string; reason: string }
export interface ScanData {
  home: string
  scannedAt: string
  scannedBytes: number
  baseFreeBytes: number
  tree: FolderNode
  items: RecommendationItem[]
  skipped: SkippedFolder[]
}
