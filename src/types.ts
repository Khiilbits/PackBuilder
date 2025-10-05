export type PackFile = { path:string; bytes:Uint8Array; sourcePackId:string; }
export type SourcePack = { id:string; name:string; files:PackFile[]; packFormat?:number }
export type FeatureKey = 'hotbar'|'hearts'|'xp'|'horse_hearts'|'horse_jump'
export type FeaturePick = { feature:FeatureKey; fromPath?:string; fromPack?:string }
export type Project = { picks: Record<FeatureKey, FeaturePick|undefined> }
