// src/components/wheelCanvas.jsx

import React, { useRef, useEffect } from 'react';

// Helper function for conditional class names
const cls = (...xs) => xs.filter(Boolean).join(" ");

export default function WheelCanvas({
  zoomed,
  wheelPx,
  angle,
  testTshirtMode,
  currentWedges,
  landed,
}) {
  const canvasRef = useRef(null);
  const zoomCanvasRef = useRef(null);

  // The entire drawWheel function is now self-contained within this component.
  const drawWheel = (rot = 0) => {
    // Determine which canvas to draw on based on the 'zoomed' prop
    const canvas = zoomed ? zoomCanvasRef.current : canvasRef.current;
    if (!canvas) return;

    // Standard canvas drawing setup
    const dpr = window.devicePixelRatio || 1;
    const W = wheelPx;
    const H = wheelPx;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    canvas.style.display = "block";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Wheel properties
    const cx = W / 2;
    const cy = H / 2;
    const pHeight = 40; // Pointer height
    const pWidth = 30;  // Pointer width
    const r = W / 2 - pHeight - 5; // Radius of the wheel

    // Logic for rendering wedges
    const wedgesToRender = testTshirtMode ? currentWedges.map((w) => (w.t === "tshirt" ? { ...w, size: 3 } : w)) : currentWedges;
    const totalSize = wedgesToRender.reduce((sum, w) => sum + (w.size || 1), 0);
    const baseArc = (Math.PI * 2) / totalSize;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    let currentAngle = 0;
    for (let i = 0; i < wedgesToRender.length; i++) {
      const w = wedgesToRender[i];
      const wedgeSize = w.size || 1;
      const arc = baseArc * wedgeSize;
      const a0 = currentAngle;
      const a1 = a0 + arc;
      const mid = a0 + arc / 2;

      // Draw wedge slice
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = w.c;
      ctx.fill();

      // Draw wedge label
      const label = w.t === "cash" ? `$${w.v}` : (w.label || w.t.toUpperCase().replace("-", " "));
      ctx.save();
      ctx.rotate(mid);
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      const darkBackgrounds = ["#222222", "#E6007E", "#6F2597", "#8C4399", "#E23759"];
      ctx.fillStyle = darkBackgrounds.includes(w.c) ? "#fff" : "#000";
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      const baseFontSize = r * 0.12;
      let fontSize = baseFontSize;
      if (w.size && w.size < 1) {
        fontSize = baseFontSize * (0.3 + w.size * 0.3);
      } else if (w.t === "lose" || w.t === "bankrupt") {
        fontSize = baseFontSize * 0.8;
      } else if (w.t === "wild" || (w.v && w.v > 500)) {
        fontSize = baseFontSize * 0.9;
      }
      ctx.font = `bold ${fontSize}px Impact, Arial Black, sans-serif`;
      const textRadius = r * 0.6;
      const isLeftHalf = mid > Math.PI / 2 && mid < (3 * Math.PI) / 2;
      if (isLeftHalf) {
        ctx.rotate(Math.PI);
        ctx.fillText(label, -textRadius, 0);
      } else {
        ctx.fillText(label, textRadius, 0);
      }
      ctx.restore();

      // Draw prize label if it exists
      if (w.prize) {
        ctx.save();
        ctx.rotate(mid);
        const prizeWidth = r * 0.8 * (w.size || 1);
        const prizeHeight = r * 0.15;
        const prizeRadius = r * 0.5;
        ctx.fillStyle = w.prize.color;
        ctx.fillRect(-prizeWidth / 2, -prizeHeight / 2 + prizeRadius, prizeWidth, prizeHeight);
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${prizeHeight * 0.7}px Impact, Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(w.prize.label, 0, prizeRadius);
        ctx.restore();
      }

      // Draw separator line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
      currentAngle = a1;
    }
    ctx.restore();

    // Draw outer border and pointer
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#333";
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, -r - 5);
    ctx.lineTo(-pWidth / 2, -r - pHeight);
    ctx.lineTo(pWidth / 2, -r - pHeight);
    ctx.closePath();
    ctx.fillStyle = "#ffd700";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  };

  // This useEffect will run whenever the wheel needs to be redrawn.
  useEffect(() => {
    // Use requestAnimationFrame to ensure smooth rendering
    const animationFrameId = requestAnimationFrame(() => drawWheel(angle));
    return () => cancelAnimationFrame(animationFrameId);
  }, [angle, wheelPx, zoomed, currentWedges, testTshirtMode]); // Dependencies for redrawing

  // Dynamic style for the central hub image
  const hubImageStyle = {
    width: "20%",
    height: "20%",
    backgroundImage: "url(/images/hub-image.png)", // Assumes hub-image.png is in your public/images directory
    backgroundSize: "110%",
    backgroundPosition: zoomed ? "10% -50px" : "10% -30px", // Different position when zoomed
  };

  return (
    <>
      {/* Main Wheel Display (visible when not zoomed) */}
      <div className="relative flex items-center justify-center">
        <canvas ref={canvasRef} style={{ width: `${wheelPx}px`, height: `${wheelPx}px` }} />
        <div
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-no-repeat pointer-events-none"
          style={hubImageStyle}
          aria-hidden="true"
        />
      </div>

      {/* Zoomed Wheel Overlay (visible only when zoomed) */}
      <div className={cls("fixed inset-0 z-50 flex items-center justify-center", !zoomed && "hidden pointer-events-none")}>
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative flex items-center justify-center z-10">
          <canvas ref={zoomCanvasRef} style={{ width: `${wheelPx}px`, height: `${wheelPx}px` }} />
          <div
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-no-repeat pointer-events-none"
            style={hubImageStyle}
            aria-hidden="true"
          />
        </div>

        {/* Text overlay for the landed wedge */}
        {landed && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-7xl sm:text-8xl lg:text-9xl font-black uppercase text-white [text-shadow:0_4px_8px_rgba(0,0,0,0.8)] pointer-events-none z-20">
            {landed?.t === "cash" && `$${landed.v.toLocaleString()}`}
            {landed?.t === "bankrupt" && "BANKRUPT"}
            {landed?.t === "lose" && "LOSE A TURN"}
            {landed?.prize?.type === "tshirt" && "T-SHIRT PRIZE!"}
            {landed?.t !== "cash" && landed?.t !== "bankrupt" && landed?.t !== "lose" && !landed?.prize && landed.label}
          </div>
        )}
      </div>
    </>
  );
}