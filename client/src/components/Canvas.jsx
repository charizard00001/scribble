import { useRef, useEffect } from 'react';
import useDrawing from '../hooks/useDrawing.js';

const COLORS = [
  '#ffffff', '#c0c0c0', '#808080', '#000000',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#92400e', '#166534', '#1e3a5f', '#7c2d12',
];

export default function Canvas({ socket, isDrawer }) {
  const canvasRef = useRef(null);
  const isDrawerRef = useRef(isDrawer);
  isDrawerRef.current = isDrawer;

  const { color, setColor, brushSize, setBrushSize, tool, setTool, handleClear } = useDrawing(
    canvasRef,
    socket,
    isDrawer
  );

  // Auto-send canvas snapshot when turn ends (for AI roast)
  useEffect(() => {
    if (!socket) return;

    const handleTurnEnded = () => {
      if (!isDrawerRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        // Create offscreen canvas with background color baked in
        // (the dark bg is CSS-only, so toDataURL gives transparent bg
        //  which AI models render as white → white strokes invisible)
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const offCtx = offscreen.getContext('2d');
        offCtx.fillStyle = '#1e1e2e';
        offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
        offCtx.drawImage(canvas, 0, 0);
        const data = offscreen.toDataURL('image/png', 0.5);
        socket.emit('canvas-snapshot', data);
        // Request roast after a short delay
        setTimeout(() => socket.emit('request-roast'), 500);
      } catch (err) {
        // Canvas export failed, ignore
      }
    };

    socket.on('turn-ended', handleTurnEnded);
    return () => socket.off('turn-ended', handleTurnEnded);
  }, [socket]);

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Canvas Container */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        <div className="relative w-full max-w-3xl">
          <canvas
            ref={canvasRef}
            className="w-full rounded-xl bg-[#1e1e2e] shadow-lg"
            style={{ cursor: isDrawer ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default' }}
          />

          {/* View-only overlay */}
          {!isDrawer && (
            <div className="absolute inset-0 rounded-xl" style={{ pointerEvents: 'none' }} />
          )}
        </div>
      </div>

      {/* Drawing Toolbar - Only visible for drawer */}
      {isDrawer && (
        <div className="shrink-0 px-3 py-2 bg-surface border-t border-surface-lighter">
          <div className="flex items-center gap-3 flex-wrap justify-center max-w-3xl mx-auto">
            {/* Colors */}
            <div className="flex gap-1 flex-wrap justify-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setTool('brush');
                  }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c && tool === 'brush'
                      ? 'border-primary scale-110'
                      : 'border-surface-lighter'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-surface-lighter hidden sm:block" />

            {/* Brush Size */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="4" />
              </svg>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-20 accent-primary"
              />
              <svg className="w-6 h-6 text-text-muted" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="8" />
              </svg>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-surface-lighter hidden sm:block" />

            {/* Tools */}
            <div className="flex gap-2">
              {/* Brush */}
              <button
                onClick={() => setTool('brush')}
                className={`p-2 rounded-lg transition-colors ${
                  tool === 'brush' ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-text'
                }`}
                title="Brush"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>

              {/* Eraser */}
              <button
                onClick={() => setTool('eraser')}
                className={`p-2 rounded-lg transition-colors ${
                  tool === 'eraser' ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-text'
                }`}
                title="Eraser"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              {/* Clear */}
              <button
                onClick={handleClear}
                className="p-2 rounded-lg text-text-muted hover:text-danger transition-colors"
                title="Clear canvas"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
