import React, { useState } from 'react'
import { Home } from './Home'
import { HUDBuilder } from './HUDBuilder'
import type { SourcePack } from '../types'

type Route = { name:'home' } | { name:'hud' }

export function App(){
  const [route, setRoute] = useState<Route>({name:'home'})
  const [packs, setPacks] = useState<SourcePack[]>([])

  return (
    <div className="container">
      <div className="title">🎨 PackBuilder <span className="badge">v0.1</span></div>
      {route.name==='home' && <Home packs={packs} setPacks={setPacks} onOpenHUD={()=>setRoute({name:'hud'})} />}
      {route.name==='hud' && <HUDBuilder packs={packs} goHome={()=>setRoute({name:'home'})} />}
    </div>
  )
}
