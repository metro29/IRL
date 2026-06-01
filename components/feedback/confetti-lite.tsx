"use client";

/** Lightweight CSS-only confetti for level-up (transform + opacity). */
export function ConfettiLite() {
  const particles = Array.from({ length: 18 }, (_, i) => i);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((i) => (
        <span
          key={i}
          className="absolute h-2 w-2 animate-fx-confetti-particle rounded-sm bg-primary/80"
          style={{
            left: `${10 + (i * 5) % 80}%`,
            top: `${15 + (i * 7) % 40}%`,
            animationDelay: `${i * 55}ms`,
            background:
              i % 3 === 0
                ? "hsl(var(--primary))"
                : i % 3 === 1
                  ? "#fbbf24"
                  : "#c084fc",
          }}
        />
      ))}
    </div>
  );
}
