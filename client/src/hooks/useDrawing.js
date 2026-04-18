import { useEffect, useRef, useState, useCallback } from 'react';

export default function useDrawing(canvasRef, socket, isDrawer) {
  const ctxRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef(null);

  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState('brush');

  const getCanvasPos = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }, []);

  const drawLine = useCallback((ctx, canvas, from, to, strokeColor, strokeSize) => {
    ctx.beginPath();
    ctx.moveTo(from.x * canvas.width, from.y * canvas.height);
    ctx.lineTo(to.x * canvas.width, to.y * canvas.height);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, []);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      const w = container.clientWidth;
      const h = Math.round(w * 9 / 16);
      canvas.width = w * 2;
      canvas.height = h * 2;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctxRef.current = ctx;
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas.parentElement);

    return () => observer.disconnect();
  }, [canvasRef]);

  // Drawing handlers (local + emit)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawer) return;

    const handleStart = (e) => {
      e.preventDefault();
      isDrawingRef.current = true;
      const pos = getCanvasPos(e, canvas);
      lastPosRef.current = pos;

      // Draw a dot
      const ctx = ctxRef.current;
      const drawColor = tool === 'eraser' ? '#1e1e2e' : color;
      const drawSize = tool === 'eraser' ? brushSize * 3 : brushSize;
      ctx.beginPath();
      ctx.arc(pos.x * canvas.width / 2, pos.y * canvas.height / 2, drawSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = drawColor;
      ctx.fill();

      socket?.emit('draw', {
        type: 'start',
        x: pos.x,
        y: pos.y,
        color: drawColor,
        size: drawSize,
      });
    };

    const handleMove = (e) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const pos = getCanvasPos(e, canvas);
      const drawColor = tool === 'eraser' ? '#1e1e2e' : color;
      const drawSize = tool === 'eraser' ? brushSize * 3 : brushSize;

      const ctx = ctxRef.current;
      drawLine(ctx, { width: canvas.width / 2, height: canvas.height / 2 }, lastPosRef.current, pos, drawColor, drawSize);

      socket?.emit('draw', {
        type: 'move',
        x: pos.x,
        y: pos.y,
        color: drawColor,
        size: drawSize,
      });

      lastPosRef.current = pos;
    };

    const handleEnd = (e) => {
      if (e) e.preventDefault();
      isDrawingRef.current = false;
      lastPosRef.current = null;
      socket?.emit('draw', { type: 'end' });
    };

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);
    canvas.addEventListener('touchcancel', handleEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('mouseleave', handleEnd);
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchend', handleEnd);
      canvas.removeEventListener('touchcancel', handleEnd);
    };
  }, [canvasRef, isDrawer, color, brushSize, tool, socket, getCanvasPos, drawLine]);

  // Receive remote draw events
  useEffect(() => {
    if (!socket) return;

    const remoteLastPos = {};

    const handleRemoteDraw = (data) => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;

      const halfW = canvas.width / 2;
      const halfH = canvas.height / 2;

      if (data.type === 'start') {
        remoteLastPos.x = data.x;
        remoteLastPos.y = data.y;
        ctx.beginPath();
        ctx.arc(data.x * halfW, data.y * halfH, data.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = data.color;
        ctx.fill();
      } else if (data.type === 'move' && remoteLastPos.x != null) {
        drawLine(ctx, { width: halfW, height: halfH }, remoteLastPos, data, data.color, data.size);
        remoteLastPos.x = data.x;
        remoteLastPos.y = data.y;
      } else if (data.type === 'end') {
        remoteLastPos.x = null;
        remoteLastPos.y = null;
      }
    };

    const handleClear = () => {
      clearCanvas();
    };

    socket.on('draw', handleRemoteDraw);
    socket.on('clear-canvas', handleClear);

    return () => {
      socket.off('draw', handleRemoteDraw);
      socket.off('clear-canvas', handleClear);
    };
  }, [socket, canvasRef, drawLine]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2);
  }, [canvasRef]);

  const handleClear = useCallback(() => {
    clearCanvas();
    socket?.emit('clear-canvas');
  }, [clearCanvas, socket]);

  return {
    color,
    setColor,
    brushSize,
    setBrushSize,
    tool,
    setTool,
    clearCanvas,
    handleClear,
  };
}
