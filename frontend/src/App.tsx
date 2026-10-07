import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RouletteGame from './games/RouletteGame';
import MichiRunnerGame from './games/MichiRunnerGame';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/games/roulette" element={<RouletteGame />} />
        <Route path="/games/michi" element={<MichiRunnerGame />} />
      </Routes>
    </Router>
  );
}

export default App;
