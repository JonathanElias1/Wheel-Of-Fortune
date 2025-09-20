import React, { useEffect, useRef } from 'react';

const ConfettiCanvas = ({ trigger }) => {
  const ref = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!trigger) return;

    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * DPR;
    canvas.height = window.innerHeight * DPR;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(DPR, DPR);

    const colors = ["#FFD700", "#FF5E5E", "#5EE3FF", "#9B8CFF", "#6EE7B7"];
    const particles = [];
    const count = 200;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: window.innerHeight / 3 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * -6 - 2,
        size: 6 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 240 + Math.floor(Math.random() * 100),
      });
    }

    const loop = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particles.forEach((p) => {
        if (p.life > 0) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.18; // gravity
          p.rotation += p.vr;
          p.life--;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (particles.every((p) => p.life <= 0)) {
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [trigger]);

  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-[70]" />;
};

export default ConfettiCanvas;