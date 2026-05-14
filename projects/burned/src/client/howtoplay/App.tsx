import { ActCover } from './acts/ActCover'
import { ActMission } from './acts/ActMission'
import { ActRoster } from './acts/ActRoster'
import { ActLoop } from './acts/ActLoop'
import { ActArsenal } from './acts/ActArsenal'
import { ActCombos } from './acts/ActCombos'
import { ActTurnInheritance } from './acts/ActTurnInheritance'
import { ActIntercept } from './acts/ActIntercept'
import { ActRemote } from './acts/ActRemote'
import { ActSignoff } from './acts/ActSignoff'
import { useScrollReveal } from './hooks/useScrollReveal'
import { ReadingProgress } from './components/ReadingProgress'
import { PlayCTA } from './components/PlayCTA'
import { returnToGame } from './returnToGame'

export function App() {
  useScrollReveal()

  return (
    <main className="desk">
      <a href="/" onClick={returnToGame} className="back-link" aria-label="Back to game">Back</a>
      <ReadingProgress />
      <article className="page" aria-labelledby="dossier-title">
        <ActCover />
        <ActMission />
        <ActRoster />
        <ActLoop />
        <ActArsenal />
        <ActCombos />
        <ActTurnInheritance />
        <ActIntercept />
        <ActRemote />
        <ActSignoff />
        <PlayCTA />
      </article>
    </main>
  )
}
