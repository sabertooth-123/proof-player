import AppShell from "./components/AppShell";
import { useProofPlayer } from "./hooks/useProofPlayer";

function App() {
  const player = useProofPlayer();

  if (!player.selectedTrace || !player.currentStep) {
    return (
      <main className="app-shell">
        <h1>Proof Player</h1>
        <p>No proof traces are available.</p>
      </main>
    );
  }

  return (
    <AppShell
      traces={player.traces}
      selectedTrace={player.selectedTrace}
      currentStepIndex={player.state.stepIndex}
      currentStep={player.currentStep}
      previousGoals={player.previousStep?.goals ?? null}
      onSelectTrace={player.selectTrace}
      onNext={player.next}
      onPrev={player.prev}
      onReset={player.reset}
      onSeek={player.seek}
      onAddTrace={player.addTrace}
    />
  );
}

export default App;
