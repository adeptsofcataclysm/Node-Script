import { motion } from "framer-motion";

interface CylinderProps {
  currentPos: number;
  bulletPos: number;
  isSpinning: boolean;
  gameOver: boolean;
}

export function Cylinder({ currentPos, bulletPos, isSpinning, gameOver }: CylinderProps) {
  const chambers = [0, 1, 2, 3, 4, 5];

  // Rotate cylinder based on currentPos
  const rotation = isSpinning ? 360 * 5 : currentPos * -60;

  return (
    <div className="relative w-64 h-64 mx-auto my-12 md:w-80 md:h-80 drop-shadow-2xl">
      <motion.div
        className="w-full h-full rounded-full bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center p-4 relative"
        animate={{ rotate: rotation }}
        transition={
          isSpinning
            ? { duration: 2.5, ease: "linear", repeat: Infinity }
            : { type: "spring", stiffness: 200, damping: 20 }
        }
        style={{ boxShadow: "inset 0 0 40px rgba(0,0,0,0.8)" }}
      >
        <div className="absolute w-12 h-12 bg-zinc-950 rounded-full z-10 border border-zinc-800 shadow-inner" />
        
        {chambers.map((i) => {
          const angle = i * 60;
          const radius = 65; // Adjust based on size
          const x = Math.sin((angle * Math.PI) / 180) * radius;
          const y = -Math.cos((angle * Math.PI) / 180) * radius;
          
          const isBullet = gameOver && bulletPos === i;

          return (
            <div
              key={i}
              className="absolute w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-zinc-700 bg-zinc-950 shadow-inner flex items-center justify-center overflow-hidden"
              style={{
                transform: `translate(${x}px, ${y}px)`,
                boxShadow: "inset 0 10px 20px rgba(0,0,0,0.9)"
              }}
            >
              {isBullet && (
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-amber-600 border-4 border-amber-400 shadow-[0_0_15px_rgba(217,119,6,0.8)]" />
              )}
            </div>
          );
        })}
      </motion.div>
      
      {/* Pointer indicating current chamber */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-red-600 drop-shadow-[0_0_5px_rgba(220,38,38,0.8)] z-20" />
    </div>
  );
}