import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RouletteGame from './games/RouletteGame';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/games/roulette" element={<RouletteGame />} />
      </Routes>
    </Router>
  );
}

export default App;
