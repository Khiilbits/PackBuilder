import type { PackFile, FeatureKey } from '../types'

// HUD texture mapping (paths we care about)
export const HUD_TEXTURES = {
  icons: 'assets/minecraft/textures/gui/icons.png',
  widgets: 'assets/minecraft/textures/gui/widgets.png',
}

// For v0.1 we do per-file picking (no pixel slicing) with strong UX.
// We still allow composing later; for now, each feature maps to a single source file path.
export const FEATURE_TO_PATH: Record<FeatureKey, string> = {
  hotbar: HUD_TEXTURES.widgets,
  hearts: HUD_TEXTURES.icons,
  xp: HUD_TEXTURES.icons,
  horse_hearts: HUD_TEXTURES.icons,
  horse_jump: HUD_TEXTURES.icons,
}

export function findCandidates(files: PackFile[], relPath: string): PackFile[] {
  const low = relPath.toLowerCase()
  return files.filter(f => f.path.toLowerCase() === low)
}
