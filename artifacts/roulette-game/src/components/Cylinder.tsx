import { motion } from "framer-motion";

interface CylinderProps {
  currentPos: number;
  bulletPos: number;
  isSpinning: boolean;
  gameOver: boolean;
  spinVersion: number; // increments every time a new spin starts
}

export function Cylinder({ currentPos, bulletPos, isSpinning, gameOver, spinVersion }: CylinderProps) {
  const chambers = [0, 1, 2, 3, 4, 5];

  // Cumulative spin-end rotation (always grows → animation always fires, never reverses)
  const spinEndRotation = 360 * 5 * Math.max(spinVersion, 1);

  // Compute the minimal forward (or zero) adjustment needed to reach the correct chamber
  // after the spin ends. This avoids any large backward jump.
  const chamberAngle = ((currentPos * -60) % 360 + 360) % 360;
  const spinEndAngle = spinEndRotation % 360;
  let delta = chamberAngle - spinEndAngle;
  // Normalise to [-180, +180] then force forward (>=0) to avoid backward motion
  if (delta < -180) delta += 360;
  if (delta > 180) delta -= 360;
  if (delta < 0) delta += 360; // always move forward (at most 360°)

  // When idle: land exactly on the correct chamber coming from the spin direction
  const idleRotation = spinEndRotation + delta;

  const rotation = isSpinning ? spinEndRotation : idleRotation;

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: 290,
          height: 290,
          background: "transparent",
          boxShadow: isSpinning
            ? "0 0 50px rgba(155,89,182,0.6), 0 0 100px rgba(155,89,182,0.2)"
            : "0 0 20px rgba(155,89,182,0.4)",
          transition: "box-shadow 0.5s",
          borderRadius: "50%",
        }}
      />

      <motion.div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: 260,
          height: 260,
          background: "rgba(0,0,0,0.95)",
          border: "4px solid #9b59b6",
          boxShadow: "0 0 20px #9b59b6, inset 0 0 40px rgba(0,0,0,0.8)",
        }}
        animate={{ rotate: rotation }}
        transition={
          isSpinning
            ? { duration: 1.7, ease: [0.0, 0.0, 0.2, 1.0] }
            : { duration: 0.35, ease: "easeOut" }
        }
      >
        {/* Center hub */}
        <div
          className="absolute rounded-full z-10"
          style={{
            width: 40,
            height: 40,
            background: "#0a0a0a",
            border: "2px solid #9b59b6",
            boxShadow: "inset 0 0 10px rgba(0,0,0,0.9)",
          }}
        />

        {chambers.map((i) => {
          const angle = i * 60;
          const radius = 85;
          const x = Math.sin((angle * Math.PI) / 180) * radius;
          const y = -Math.cos((angle * Math.PI) / 180) * radius;
          const isBullet = gameOver && bulletPos === i;

          return (
            <div
              key={i}
              className="absolute rounded-full flex items-center justify-center"
              style={{
                width: 50,
                height: 50,
                transform: `translate(${x}px, ${y}px)`,
                background: isBullet ? "#f1c40f" : "#111",
                border: isBullet ? "2px solid #f1c40f" : "2px solid #222",
                boxShadow: isBullet
                  ? "0 0 30px #f1c40f, inset 0 0 10px rgba(241,196,15,0.3)"
                  : "inset 0 10px 20px rgba(0,0,0,0.9)",
                transition: "background 0.3s, box-shadow 0.3s",
              }}
            />
          );
        })}
      </motion.div>

      {/* Top pointer triangle */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 z-20"
        style={{
          width: 0,
          height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: "16px solid #9b59b6",
          filter: "drop-shadow(0 0 6px rgba(155,89,182,0.9))",
        }}
      />
    </div>
  );
}
