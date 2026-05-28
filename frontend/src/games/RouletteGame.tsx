import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const prizes = [
  { name: "¡JUEGO EXTRA!", type: "bonus" },
  { name: "¡CUPÓN 50%!", type: "normal" },
  { name: "¡TIRADA GRATIS!", type: "freespin" },
  { name: "¡PRODUCTO GRATIS!", type: "normal" },
  { name: "¡EL PREMIO MAYOR!", type: "jackpot" },
  { name: "¡DESCUENTO!", type: "normal" }
];

export default function RouletteGame() {
  const [currentRotation, setCurrentRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isBigToast, setIsBigToast] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [lastWin, setLastWin] = useState("---");
  const [showBonus, setShowBonus] = useState(false);
  const [chestSelected, setChestSelected] = useState<number | null>(null);
  const [revealedChest, setRevealedChest] = useState<any>(null);
  const [otherChest, setOtherChest] = useState<any>(null);

  const showMessage = (msg: string, isBig = false) => {
    setToastMessage(msg);
    setIsBigToast(isBig);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, isBig ? 4500 : 3000);
  };

  const fireStandardConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      zIndex: 99999
    });
  };

  const triggerJackpot = () => {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
    showMessage("🎉 ¡¡¡EL GRAN JACKPOT ES TUYO!!! 🎉", true);

    const duration = 4000;
    const end = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 99999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
      const timeLeft = end - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 40 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { 
        particleCount, 
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#FFA500', '#FFFFFF', '#FF0000']
      }));
      confetti(Object.assign({}, defaults, { 
        particleCount, 
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#FFA500', '#FFFFFF', '#FF0000']
      }));
    }, 250);
  };

  const processPrize = (prize: any) => {
    const baseMessage = `¡¡¡TE GANASTE: ${prize.name}!!!`;

    if (prize.type === "normal") {
      showMessage(baseMessage);
      fireStandardConfetti();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      
    } else if (prize.type === "jackpot") {
      triggerJackpot();
      
    } else if (prize.type === "freespin") {
      showMessage("¡¡¡UNA TIRADA MÁS!!! ¡GIRANDO DE NUEVO!", true);
      fireStandardConfetti();
      if (navigator.vibrate) navigator.vibrate([200]);
      setTimeout(() => spin(), 2000);
      
    } else if (prize.type === "bonus") {
      showMessage("¡¡¡DESBLOQUEASTE EL JUEGO MISTERIOSO!!!", true);
      fireStandardConfetti();
      setTimeout(() => {
        setChestSelected(null);
        setRevealedChest(null);
        setOtherChest(null);
        setShowBonus(true);
      }, 1500);
    }
  };

  const currentRotationRef = React.useRef(0);

  const spin = () => {
    if (isSpinning) return;
    setIsSpinning(true);

    const minSpins = 4;
    const maxSpins = 8;
    const extraSpinsAngle = (Math.floor(Math.random() * (maxSpins - minSpins + 1)) + minSpins) * 360;
    const randomOffset = Math.floor(Math.random() * 360); 

    const newRot = currentRotationRef.current + extraSpinsAngle + randomOffset;
    currentRotationRef.current = newRot;
    setCurrentRotation(newRot);

    setTimeout(() => {
      setIsSpinning(false);
      const normalizedAngle = newRot % 360;
      const sliceIndex = Math.floor(((360 - normalizedAngle + 30) % 360) / 60) % 6;
      const prize = prizes[sliceIndex];
      setLastWin(prize.name);
      processPrize(prize);
    }, 3500);
  };

  const pickChest = (index: number) => {
    if (chestSelected !== null) return;
    setChestSelected(index);

    const bonusPrizes = [
      { 
        icon: '⭐', text: '¡PREMIO<br>GIGANTE!', name: 'PREMIO GIGANTE',
        bg: 'bg-green-600', border: 'border-green-400',
        darkBg: 'bg-green-900', darkBorder: 'border-green-800'
      },
      { 
        icon: '🎁', text: '¡REGALO<br>ESPECIAL!', name: 'REGALO ESPECIAL',
        bg: 'bg-purple-600', border: 'border-purple-400',
        darkBg: 'bg-purple-900', darkBorder: 'border-purple-800'
      }
    ];

    const isSwapped = Math.random() > 0.5;
    const selectedPrize = isSwapped ? bonusPrizes[0] : bonusPrizes[1];
    const otherPrizeItem = isSwapped ? bonusPrizes[1] : bonusPrizes[0];

    setRevealedChest(selectedPrize);

    setTimeout(() => {
      setOtherChest(otherPrizeItem);
    }, 400);

    setTimeout(() => {
      showMessage(`¡¡¡Felicidades, ganaste el ${selectedPrize.name}!!!`, true);
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, zIndex: 99999 });
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

      setTimeout(() => {
        setShowBonus(false);
      }, 2500);
    }, 800);
  };

  return (
    <div className="bg-[#05100a] h-screen w-screen flex flex-col overflow-hidden text-white selection:bg-yellow-500 relative" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <Link to="/" className="absolute top-4 left-4 z-50 text-white/70 hover:text-white transition-colors bg-white/10 p-2 rounded-full backdrop-blur-md">
        <ArrowLeft size={24} />
      </Link>

      <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top, #1b3a2a 0%, #0a1f14 60%, #05100a 100%)' }}></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60%] pointer-events-none z-0" style={{ background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.1) 0%, transparent 60%)' }}></div>
      
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'radial-gradient(circle at center, #d4af37 1px, transparent 1.5px), radial-gradient(circle at center, #fde093 0.5px, transparent 1px)',
        backgroundSize: '40px 40px, 60px 60px',
        backgroundPosition: '0 0, 20px 20px',
        opacity: 0.15
      }}></div>

      <header className="flex justify-center items-center p-6 z-10 w-full max-w-md mx-auto pt-16">
        <h1 className="font-black text-4xl text-yellow-500 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-widest italic text-center uppercase">
          ¡Gira y <span className="text-white">Gana!</span>
        </h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative w-full px-4">
        
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md text-white px-8 py-4 rounded-2xl border-2 font-black text-xl md:text-2xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] transition-all duration-300 pointer-events-none z-50 text-center whitespace-nowrap uppercase tracking-wide
          ${toastVisible ? 'opacity-100 translate-y-5' : 'opacity-0 -translate-y-5'}
          ${isBigToast ? 'scale-110 text-yellow-300 border-yellow-300' : 'border-yellow-500'}
        `}>
          {toastMessage}
        </div>

        <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] flex-shrink-0 mt-4 select-none">
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#7a0016] to-[#3a0008] shadow-[0_15px_35px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(0,0,0,0.9)] border-4 border-[#ffb703]"></div>
          
          <svg className="absolute inset-0 w-full h-full drop-shadow-[0_0_8px_#ffea00] pointer-events-none z-10" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="47.5" fill="none" stroke="#ffb703" strokeWidth="2.5" strokeDasharray="0 12.43" strokeLinecap="round" />
            <circle cx="50" cy="50" r="47.5" fill="none" stroke="#fff" strokeWidth="1.2" strokeDasharray="0 12.43" strokeLinecap="round" />
          </svg>

          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center drop-shadow-[0_5px_10px_rgba(0,0,0,0.8)]">
            <div className="w-12 h-16 bg-white/30 backdrop-blur-md border-x-2 border-t-2 border-white/80 shadow-[0_5px_15px_rgba(0,0,0,0.5)] relative" style={{clipPath: 'polygon(50% 100%, 0 0, 100% 0)'}}>
              <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent"></div>
            </div>
          </div>

          <div className="absolute top-[6%] left-[6%] w-[88%] h-[88%] rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] border-4 border-yellow-800 overflow-hidden bg-black z-0">
            <div 
              className="w-full h-full origin-center will-change-transform"
              style={{
                transform: `rotate(${currentRotation}deg)`,
                transition: isSpinning ? 'transform 3.5s cubic-bezier(0.25, 0.1, 0.1, 1)' : 'none'
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0">
                <g transform="rotate(-90 50 50)">
                  
                  <g transform="rotate(0 50 50)">
                    <path d="M 50 50 L 93.3 25 A 50 50 0 0 1 93.3 75 Z" fill="#e63946" stroke="#ffffff" strokeWidth="0.5" />
                    <image href="https://placehold.co/100x100/ffffff/000000?text=LOGO+1" x="53" y="41" width="18" height="18" />
                    <text x="83" y="50" fontSize="4" fontWeight="900" fill="#ffffff" textAnchor="middle" dominantBaseline="middle" transform="rotate(90 83 50)">¡JUEGO EXTRA!</text>
                  </g>

                  <g transform="rotate(60 50 50)">
                    <path d="M 50 50 L 93.3 25 A 50 50 0 0 1 93.3 75 Z" fill="#2a9d8f" stroke="#ffffff" strokeWidth="0.5" />
                    <image href="https://placehold.co/100x100/ffffff/000000?text=LOGO+2" x="53" y="41" width="18" height="18" />
                    <text x="83" y="50" fontSize="4" fontWeight="900" fill="#ffffff" textAnchor="middle" dominantBaseline="middle" transform="rotate(90 83 50)">¡CUPÓN 50%!</text>
                  </g>

                  <g transform="rotate(120 50 50)">
                    <path d="M 50 50 L 93.3 25 A 50 50 0 0 1 93.3 75 Z" fill="#e9c46a" stroke="#ffffff" strokeWidth="0.5" />
                    <image href="https://placehold.co/100x100/000000/ffffff?text=LOGO+3" x="53" y="41" width="18" height="18" />
                    <text x="83" y="50" fontSize="4" fontWeight="900" fill="#000000" textAnchor="middle" dominantBaseline="middle" transform="rotate(90 83 50)">¡TIRADA GRATIS!</text>
                  </g>

                  <g transform="rotate(180 50 50)">
                    <path d="M 50 50 L 93.3 25 A 50 50 0 0 1 93.3 75 Z" fill="#f4a261" stroke="#ffffff" strokeWidth="0.5" />
                    <image href="https://placehold.co/100x100/ffffff/000000?text=LOGO+4" x="53" y="41" width="18" height="18" />
                    <text x="83" y="50" fontSize="4" fontWeight="900" fill="#ffffff" textAnchor="middle" dominantBaseline="middle" transform="rotate(90 83 50)">¡PRODUCTO!</text>
                  </g>

                  <g transform="rotate(240 50 50)">
                    <path d="M 50 50 L 93.3 25 A 50 50 0 0 1 93.3 75 Z" fill="#264653" stroke="#ffffff" strokeWidth="0.5" />
                    <image href="https://placehold.co/100x100/ffffff/000000?text=LOGO+5" x="53" y="41" width="18" height="18" />
                    <text x="83" y="50" fontSize="4" fontWeight="900" fill="#ffffff" textAnchor="middle" dominantBaseline="middle" transform="rotate(90 83 50)">¡PREMIO MAYOR!</text>
                  </g>

                  <g transform="rotate(300 50 50)">
                    <path d="M 50 50 L 93.3 25 A 50 50 0 0 1 93.3 75 Z" fill="#9b5de5" stroke="#ffffff" strokeWidth="0.5" />
                    <image href="https://placehold.co/100x100/ffffff/000000?text=LOGO+6" x="53" y="41" width="18" height="18" />
                    <text x="83" y="50" fontSize="4" fontWeight="900" fill="#ffffff" textAnchor="middle" dominantBaseline="middle" transform="rotate(90 83 50)">¡DESCUENTO!</text>
                  </g>

                </g>
              </svg>
            </div>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[22%] h-[22%] rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.9),inset_0_2px_5px_rgba(255,255,255,0.9)] border-[4px] border-[#fdf0a6] z-20 flex items-center justify-center bg-gradient-to-br from-[#eecb7a] via-[#c69a3d] to-[#996a1a]">
            <div className="w-full h-full rounded-full border-2 border-yellow-900/50 flex items-center justify-center">
              <span className="text-[#3b2704] font-black text-lg sm:text-xl tracking-widest drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] text-center leading-none">SPIN</span>
            </div>
          </div>

        </div>

        <div className="mt-8 h-8 text-center">
          <p className={`text-green-400 font-bold text-xl tracking-wider transition-opacity duration-500 drop-shadow-md uppercase ${lastWin !== "---" ? 'opacity-100' : 'opacity-0'}`}>
            ¡Último premio: {lastWin}!
          </p>
        </div>
      </main>

      <footer className="pb-12 pt-4 z-10 w-full flex flex-col items-center">
        <button 
          onClick={spin}
          disabled={isSpinning}
          className="relative group outline-none transform transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-white rounded-xl blur-xl opacity-10 group-hover:opacity-30 transition-opacity duration-300"></div>
          <div className="relative bg-gradient-to-b from-[#f5f5f5] via-[#cfcfcf] to-[#8a8a8a] border-[2px] border-white/60 text-[#2a1e0b] font-black text-3xl px-12 sm:px-16 py-5 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_2px_2px_rgba(255,255,255,0.9)] transition-all select-none flex items-center justify-center">
            <span className="drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">¡GIRAR AHORA!</span>
          </div>
        </button>
      </footer>

      {/* Modal Bono */}
      {showBonus && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-md transition-opacity">
          <div className="bg-gradient-to-b from-amber-800 to-amber-950 p-8 rounded-3xl border border-yellow-500/50 shadow-[0_0_50px_rgba(234,179,8,0.3)] text-center max-w-sm w-full mx-5 relative overflow-hidden animate-popIn">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-300 to-transparent opacity-50"></div>
            
            <h2 className="text-3xl font-black text-yellow-400 mb-2 drop-shadow-lg italic uppercase">¡¡¡JUEGO MISTERIOSO!!!</h2>
            <p className="text-gray-200 mb-8 font-medium text-lg">¡Elige un cofre para revelar tu premio garantizado!</p>
            
            <div className="flex justify-around gap-6">
              {[0, 1].map((idx) => {
                const isSelected = chestSelected === idx;
                const isOther = chestSelected !== null && chestSelected !== idx;
                
                let content = <>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  📦
                </>;
                let classes = "w-32 h-32 bg-amber-700 hover:bg-amber-600 border-amber-500 rounded-2xl border-2 shadow-2xl flex items-center justify-center text-6xl outline-none relative overflow-hidden group";

                if (isSelected && revealedChest) {
                  classes = `w-32 h-32 ${revealedChest.bg} ${revealedChest.border} rounded-2xl border-2 shadow-2xl flex items-center justify-center text-6xl outline-none relative overflow-hidden`;
                  content = <div className="flex flex-col items-center">
                    {revealedChest.icon}
                    <span className="text-sm font-black text-white drop-shadow-md mt-1 leading-tight" dangerouslySetInnerHTML={{ __html: revealedChest.text }}></span>
                  </div>;
                } else if (isOther && otherChest) {
                  classes = `w-32 h-32 ${otherChest.darkBg} ${otherChest.darkBorder} opacity-60 scale-95 rounded-2xl border-2 shadow-2xl flex items-center justify-center text-6xl outline-none relative overflow-hidden`;
                  content = <div className="flex flex-col items-center">
                    {otherChest.icon}
                    <span className="text-xs font-bold text-gray-300 mt-1 leading-tight" dangerouslySetInnerHTML={{ __html: otherChest.text }}></span>
                  </div>;
                }

                return (
                  <button 
                    key={idx}
                    onClick={() => pickChest(idx)}
                    disabled={chestSelected !== null}
                    className={`${classes} ${chestSelected === null ? 'hover:scale-105 transition-all' : 'transition-all duration-500'}`}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
