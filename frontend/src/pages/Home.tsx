import { Link } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#e8effe] text-[#1a2340] flex flex-col font-sans">
      <header className="bg-[#0C4AB5] text-white p-6 shadow-md flex justify-center items-center">
        <h1 className="text-3xl font-bold tracking-wide">DonaFácil Play</h1>
      </header>

      <main className="flex-1 container mx-auto p-6 flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-8 text-[#083790]">Selecciona un Juego</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
          {/* Card Ruleta */}
          <Link to="/games/roulette" className="block group">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all group-hover:scale-105 border border-[#d6dff0] hover:border-[#FDC300]">
              <div className="h-40 bg-gradient-to-br from-[#0C4AB5] to-[#083790] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#ffffff30_1px,_transparent_1.5px)] bg-[size:20px_20px] opacity-30"></div>
                <Gamepad2 size={64} className="text-[#FDC300] drop-shadow-md z-10" />
              </div>
              <div className="p-6 text-center">
                <h3 className="text-xl font-bold text-[#1a2340] mb-2 uppercase">Ruleta de la Suerte</h3>
                <p className="text-[#6b7ba0] text-sm">¡Gira y gana increíbles premios y descuentos!</p>
              </div>
            </div>
          </Link>

          {/* Futuros juegos */}
          <div className="bg-white/50 rounded-2xl shadow-sm border border-dashed border-[#6b7ba0] h-[280px] flex flex-col items-center justify-center text-[#6b7ba0] opacity-70">
            <span className="text-4xl mb-2">🔜</span>
            <p className="font-semibold uppercase tracking-wide">Próximamente</p>
          </div>
        </div>
      </main>
    </div>
  );
}
