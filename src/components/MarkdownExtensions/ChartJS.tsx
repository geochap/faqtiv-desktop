import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import './ChartJS.css';

interface ChartJSProps {
  children: React.ReactNode; // Accepts Markdown-generated children
}

const ChartJS: React.FC<ChartJSProps> = ({ children }) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  let chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Convert `children` to string and clean up any potential Markdown artifacts
    const rawJson = React.Children.toArray(children).join('').trim();

    try {
      const chartConfig = JSON.parse(rawJson);
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      chartInstance.current = new Chart(chartRef.current, chartConfig);
    } catch (error) {
      console.error('Invalid JSON format for ChartJS:', error);
    }
  }, [children]);

  return <canvas ref={chartRef} className="chartjs" />;
};

export default ChartJS;
