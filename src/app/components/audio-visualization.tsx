import { useEffect, useRef } from 'react';

interface AudioVisualizationProps {
  label: string;
  data: number[];
}

export default function AudioVisualization({
  label,
  data
}: AudioVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawVisualization = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);

      data.forEach((value, index) => {
        const x = (index / (data.length - 1)) * canvas.width;
        const y = ((1 - value) / 2) * canvas.height;
        ctx.lineTo(x, y);
      });

      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawVisualization();
  }, [data]);

  return (
    <div>
      <h3 className='text-sm font-medium mb-2'>{label}</h3>
      <canvas
        ref={canvasRef}
        width={400}
        height={100}
        className='w-full h-[100px] bg-muted rounded-md'
      />
    </div>
  );
}
