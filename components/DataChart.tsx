import React, { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { generateChartSummaryAndImage } from '../services/geminiService';
import { ImageIcon } from './Icons';

interface DataChartProps {
  data: any[];
}

interface ChartDataPoint {
  lon: number;
  temp: number;
  psal: number;
  id: string;
  cycle: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg text-white">
        <p className="text-sm font-bold">{`Float ID: ${data.id}`}</p>
        <p className="text-sm">{`Longitude: ${data.lon.toFixed(2)}°`}</p>
        {data.temp != null && <p className="text-sm">{`Temperature: ${data.temp.toFixed(2)}°C`}</p>}
        {data.psal != null && <p className="text-sm">{`Salinity: ${data.psal.toFixed(2)}`}</p>}
        <p className="text-sm">{`Cycle: ${data.cycle}`}</p>
      </div>
    );
  }
  return null;
};


export const DataChart: React.FC<DataChartProps> = ({ data }) => {
  const [visibleSeries, setVisibleSeries] = useState({
    temp: true,
    psal: true,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!data || data.length === 0) return [];
    return data
      .map((profile) => ({
        lon: profile.geolocation.coordinates[0],
        temp: profile.temp?.[0],
        psal: profile.psal?.[0],
        id: profile.platform_id,
        cycle: profile.cycle_number,
      }))
      .filter(
        (p): p is ChartDataPoint =>
          p.lon != null && p.temp != null && p.psal != null
      )
      .sort((a, b) => a.lon - b.lon);
  }, [data]);

  const resetGeneration = () => {
    setGeneratedImage(null);
    setGeneratedSummary(null);
    setGenerationError(null);
  };

  const handleLegendClick = (e: any) => {
    resetGeneration();
    const { value } = e;
    if (value === 'Surface Temperature') {
      setVisibleSeries(prev => ({ ...prev, temp: !prev.temp }));
    } else if (value === 'Surface Salinity') {
      setVisibleSeries(prev => ({ ...prev, psal: !prev.psal }));
    }
  };
  
  const handleGenerateVisualSummary = async () => {
    setIsGenerating(true);
    resetGeneration();

    const dataForSummary = chartData.filter(d => 
        (visibleSeries.temp && d.temp != null) || (visibleSeries.psal && d.psal != null)
    ).map(d => ({
        lon: d.lon,
        ...(visibleSeries.temp && { temp: d.temp }),
        ...(visibleSeries.psal && { psal: d.psal }),
    }));


    try {
        const result = await generateChartSummaryAndImage(dataForSummary);
        setGeneratedSummary(result.summary);
        setGeneratedImage(result.imageUrl);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        setGenerationError(errorMessage);
    } finally {
        setIsGenerating(false);
    }
  };

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400">No data available to display chart.</div>;
  }

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto p-2">
      <div className="h-[50vh] min-h-[350px] flex-shrink-0">
        <p className="text-center text-gray-400 text-xs pb-2">
            Click on legend items to toggle visibility.
        </p>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
            <XAxis 
              dataKey="lon" 
              type="number" 
              name="Longitude" 
              unit="°"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: '#A0AEC0' }}
              stroke="#A0AEC0"
              label={{ value: "Longitude", position: 'insideBottom', offset: -15, fill: '#E2E8F0' }}
            />
            {visibleSeries.temp && (
              <YAxis
                yAxisId="left"
                dataKey="temp"
                type="number"
                name="Temperature"
                unit="°C"
                stroke="#38B2AC"
                tick={{ fill: '#38B2AC' }}
                label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', fill: '#81E6D9', dx: -10 }}
              />
            )}
            {visibleSeries.psal && (
              <YAxis
                yAxisId="right"
                dataKey="psal"
                type="number"
                name="Salinity"
                orientation="right"
                stroke="#9F7AEA"
                tick={{ fill: '#9F7AEA' }}
                label={{ value: 'Salinity', angle: 90, position: 'insideRight', fill: '#D6BCFA', dx: 15 }}
              />
            )}
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
            <Legend 
              onClick={handleLegendClick} 
              wrapperStyle={{ color: '#E2E8F0', paddingTop: '20px', cursor: 'pointer' }} 
            />
            {visibleSeries.temp && <Scatter yAxisId="left" name="Surface Temperature" data={chartData} fill="#38B2AC" />}
            {visibleSeries.psal && <Scatter yAxisId="right" name="Surface Salinity" data={chartData} fill="#9F7AEA" />}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-shrink-0 flex flex-col items-center justify-center space-y-4 pt-6 mt-4 border-t border-gray-700">
        {generatedImage ? (
          <div className="w-full max-w-xl p-4 bg-gray-900/50 rounded-lg space-y-3 animate-fade-in">
              <h3 className="text-lg font-semibold text-cyan-300">AI Visual Summary</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{generatedSummary}</p>
              <div className="mt-2 rounded-lg overflow-hidden border-2 border-cyan-500/50">
                <img src={generatedImage} alt="Generated visual summary of chart data" className="w-full h-auto" />
              </div>
          </div>
        ) : isGenerating ? (
            <div className="flex items-center justify-center p-4 bg-gray-900/50 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <p className="ml-3 text-cyan-300">Generating visual summary...</p>
            </div>
        ) : (
            <>
              <button
                  onClick={handleGenerateVisualSummary}
                  disabled={isGenerating || (!visibleSeries.temp && !visibleSeries.psal)}
                  className="w-full max-w-xs flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Generate Visual Summary
              </button>
              {generationError && <p className="text-red-400 text-sm mt-2">{generationError}</p>}
            </>
        )}
      </div>
    </div>
  );
};