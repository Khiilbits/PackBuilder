import React, { useMemo, useState } from 'react'
import type { SourcePack, PackFile, FeatureKey } from '../types'
import { FEATURE_TO_PATH, findCandidates } from '../lib/hudAtlas'
import { buildZip } from '../lib/zip'

type PickState = Partial<Record<FeatureKey, PackFile>>

const FEATURES: {key:FeatureKey, label:string, desc:string}[] = [
  { key:'hotbar', label:'Hotbar', desc:'widgets.png (inventory hotbar frame & slot highlights)' },
  { key:'hearts', label:'Hearts', desc:'icons.png (health hearts tiles)' },
  { key:'xp', label:'XP Bar', desc:'icons.png (experience bar)' },
  { key:'horse_hearts', label:'Horse Hearts', desc:'icons.png (mount health hearts)' },
  { key:'horse_jump', label:'Horse Jump', desc:'icons.png (mount jump bar)' },
]

export function HUDBuilder({packs, goHome}:{packs:SourcePack[], goHome:()=>void}){
  const all = useMemo(()=> packs.flatMap(p=>p.files), [packs])
  const [picks, setPicks] = useState<PickState>({})

  const candidatesByFeature: Record<FeatureKey, PackFile[]> = useMemo(()=>{
    const map: any = {}
    for (const f of FEATURES) map[f.key] = findCandidates(all, FEATURE_TO_PATH[f.key])
    return map
  }, [all])

  const choose = (k:FeatureKey, path:string)=>{
    const pf = all.find(f => f.path === path)
    setPicks(prev => ({...prev, [k]: pf}))
  }

  const exportPack = async ()=>{
    const out: {path:string, bytes:Uint8Array}[] = []
    // For each feature, emit the chosen file (if any). Later we will be slicing subregions.
    for (const f of FEATURES) {
      const pf = picks[f.key]
      if (pf) out.push({ path: FEATURE_TO_PATH[f.key], bytes: pf.bytes })
    }
    if (out.length===0) { alert('Pick at least one feature.'); return }
    const blob = await buildZip(out)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'HUD-Pack.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid" style={{marginTop:16, gap:16}}>
      <div className="row" style={{justifyContent:'space-between'}}>
        <button className="btn" onClick={goHome}>← Back</button>
        <button className="btn primary" onClick={exportPack}>Export HUD Pack</button>
      </div>
      <div className="col-3">
        <section className="panel">
          <div style={{fontWeight:800, marginBottom:6}}>Features</div>
          <div className="list">
            {FEATURES.map(f=>{
              const count = candidatesByFeature[f.key].length
              return (
                <div key={f.key} className="item">
                  <div>
                    <div style={{fontWeight:700}}>{f.label}</div>
                    <div className="muted">{f.desc}</div>
                  </div>
                  <span className="badge">{count} option{count===1?'':'s'}</span>
                </div>
              )
            })}
          </div>
          <div className="muted" style={{marginTop:8}}>Tip: Drop more packs on Home to see more options here.</div>
        </section>
        <section className="panel">
          <div style={{fontWeight:800, marginBottom:6}}>Live Preview</div>
          <div className="preview">
            <div className="hud">
              <div className="hotbar">{picks.hotbar ? `Hotbar from ${picks.hotbar.sourcePackId}` : 'Hotbar (choose)'}</div>
              <div className="hearts">{picks.hearts ? `Hearts from ${picks.hearts.sourcePackId}` : 'Hearts (choose)'}</div>
              <div className="xp">{picks.xp ? `XP from ${picks.xp.sourcePackId}` : 'XP (choose)'}</div>
              <div className="horse">{picks.horse_hearts || picks.horse_jump ? `Horse HUD chosen` : 'Horse HUD (choose)'}</div>
            </div>
          </div>
          <div className="muted" style={{marginTop:8}}>Visual preview placeholder — in v0.2 we will render stitched textures.</div>
        </section>
        <section className="panel">
          <div style={{fontWeight:800, marginBottom:6}}>Choose Sources</div>
          <div style={{display:'grid', gap:10}}>
            {FEATURES.map(f=>{
              const opts = candidatesByFeature[f.key]
              return (
                <div key={f.key}>
                  <div style={{fontWeight:700, marginBottom:4}}>{f.label}</div>
                  <select className="select" value={picks[f.key]?.path ?? ''} onChange={e=>choose(f.key, e.target.value)}>
                    <option value="">(skip)</option>
                    {opts.map(pf => (
                      <option key={pf.path + pf.sourcePackId} value={pf.path}>{pf.sourcePackId}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
