import { useMemo } from "react";

interface Star {
  size: number;
  left: number;
  top: number;
  opacity: number;
}

function generateStars(count: number, seed: number): Star[] {
  const stars: Star[] = [];
  let s = seed;
  const rng = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  for (let i = 0; i < count; i++) {
    stars.push({
      size: rng() * 2 + 1,
      left: rng() * 100,
      top: rng() * 100,
      opacity: rng() * 0.55 + 0.15,
    });
  }
  return stars;
}

export function StarField() {
  const stars = useMemo(() => generateStars(70, 42), []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      {stars.map((star, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: star.size + "px",
            height: star.size + "px",
            background: "#fff",
            borderRadius: "50%",
            left: star.left + "%",
            top: star.top + "%",
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  );
}
