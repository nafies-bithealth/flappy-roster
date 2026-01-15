import GameCanvas from './components/GameCanvas';

function App() {
  return (
    <div className="w-screen h-screen bg-zinc-900 flex items-center justify-center overflow-hidden touch-none select-none">
      <GameCanvas />
    </div>
  );
}

export default App;
