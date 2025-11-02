import React, { useState } from 'react';
import type { PaletteColor } from '../types';
import { randomPleasantHex } from '../lib/color-utils';
import { createColorId } from '../lib/color-utils';

type CraftVisualizerProps = {
  palette: PaletteColor[];
  onPaletteChange: (palette: PaletteColor[]) => void;
};

// Helper function to determine if a color is dark or light
function isDarkColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

// Intelligent color assignment based on purpose
function assignColors(colors: string[]) {
  const sorted = [...colors];
  
  // Sort by lightness - darker colors first
  sorted.sort((a, b) => {
    const aDark = isDarkColor(a);
    const bDark = isDarkColor(b);
    if (aDark && !bDark) return -1;
    if (!aDark && bDark) return 1;
    return 0;
  });

  const darkColors = sorted.filter(c => isDarkColor(c));
  const lightColors = sorted.filter(c => !isDarkColor(c));

  // Assign colors based on visual hierarchy
  return {
    // Primary actions and headers - use darker, more saturated colors
    primary: darkColors[0] || sorted[0] || '#0f172a',
    secondary: darkColors[1] || sorted[1] || sorted[0] || '#14b8a6',
    
    // Accents and highlights - use medium colors
    accent: lightColors[0] || sorted[2] || sorted[1] || '#38bdf8',
    highlight: lightColors[1] || sorted[3] || sorted[2] || sorted[0] || '#10b981',
    
    // Data visualization - use vibrant colors
    success: lightColors[0] || sorted[3] || sorted[2] || '#10b981',
    warning: lightColors[1] || sorted[4] || sorted[3] || sorted[1] || '#f59e0b',
    
    // Backgrounds and surfaces - use lightest colors
    cardAccent1: sorted[0] || '#0f172a',
    cardAccent2: sorted[1] || '#14b8a6',
    cardAccent3: sorted[2] || sorted[0] || '#38bdf8',
    cardAccent4: sorted[3] || sorted[1] || '#10b981',
    
    // All colors array for cycling
    allColors: sorted
  };
}

export function CraftVisualizer({ palette, onPaletteChange }: CraftVisualizerProps) {
  const [showPaletteViewer, setShowPaletteViewer] = useState(false);
  const colors = palette.map((color) => color.hex);
  const colorMap = assignColors(colors);

  const handleGenerateNew = () => {
    const newColors = Array.from({ length: palette.length || 5 }, () => randomPleasantHex());
    const newPalette: PaletteColor[] = newColors.map((hex) => ({
      id: createColorId(),
      hex: hex,
      locked: false
    }));
    onPaletteChange(newPalette);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <div className="flex h-16 items-center justify-center border-b border-white/10 bg-slate-950/90 px-6 backdrop-blur sm:px-10">
        <p className="font-display text-2xl font-semibold tracking-tight text-white">Craft Visualizer</p>
      </div>

      {/* Floating Generate Button & Palette Viewer */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {showPaletteViewer && (
          <div className="rounded-2xl border border-white/20 bg-slate-900/95 backdrop-blur-md p-4 shadow-2xl">
            <div className="flex gap-2 mb-3">
              {colors.map((hex, index) => (
                <div
                  key={index}
                  className="w-12 h-12 rounded-lg border-2 border-white/20 cursor-pointer transition-transform hover:scale-110"
                  style={{ background: hex }}
                  onClick={() => {
                    // Cycle to next color in palette
                    const newColors = [...colors];
                    const nextIndex = (index + 1) % colors.length;
                    newColors[index] = colors[nextIndex];
                    const newPalette: PaletteColor[] = newColors.map((hex, i) => ({
                      id: palette[i]?.id || createColorId(),
                      hex: hex,
                      locked: false
                    }));
                    onPaletteChange(newPalette);
                  }}
                  title={hex}
                />
              ))}
            </div>
            <button
              onClick={() => setShowPaletteViewer(false)}
              className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition"
            >
              Close
            </button>
          </div>
        )}
        <button
          onClick={() => setShowPaletteViewer(!showPaletteViewer)}
          className="h-14 w-14 rounded-full shadow-2xl flex items-center justify-center text-white font-bold text-xl transition-all hover:scale-110 hover:shadow-teal-500/50"
          style={{ background: colorMap.primary }}
          title="View Palette"
        >
          🎨
        </button>
        <button
          onClick={handleGenerateNew}
          className="h-14 w-14 rounded-full shadow-2xl flex items-center justify-center text-white font-bold text-xl transition-all hover:scale-110 hover:shadow-teal-500/50"
          style={{ background: colorMap.accent }}
          title="Generate New Palette"
        >
          ✨
        </button>
      </div>

      <main className="flex flex-1 overflow-hidden bg-white">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r bg-white border-gray-200">
          <div className="p-6">
            <div className="mb-8">
              <div className="h-8 w-32 rounded mb-2" style={{ background: colorMap.primary }} />
              <div className="h-2 w-24 rounded" style={{ background: colorMap.primary, opacity: 0.5 }} />
            </div>
            
            <nav className="space-y-2">
              {['Overview', 'Transactions', 'Customers', 'Reports', 'Settings'].map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition relative"
                  style={{
                    background: index === 0 ? colorMap.primary : 'transparent',
                    color: index === 0 ? '#ffffff' : '#64748b'
                  }}
                >
                  <div className="h-5 w-5 rounded" style={{ background: index === 0 ? '#ffffff' : colorMap.primary, opacity: index === 0 ? 0.3 : 0.5 }} />
                  <span className="text-sm font-medium">
                    {item}
                  </span>
                  {index === 2 && (
                    <div className="ml-auto h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: colorMap.accent }}>
                      3
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Quick Actions */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="h-3 w-20 rounded bg-gray-400 mb-4" />
              <div className="space-y-2">
                {['New Deal', 'Add Customer', 'Create Report'].map((action, i) => (
                  <button
                    key={action}
                    className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-white transition hover:opacity-90"
                    style={{ background: colorMap.allColors[i % colorMap.allColors.length] || colorMap.primary }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content - White Background */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Top Bar */}
          <header className="h-16 border-b flex items-center justify-between px-6 bg-white border-gray-200">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
              <div className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ background: colorMap.accent }}>
                Live
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-64 rounded-lg border border-gray-300 flex items-center gap-2 px-3 bg-white">
                <div className="h-4 w-4 rounded" style={{ background: colorMap.accent, opacity: 0.3 }} />
                <div className="h-3 w-32 rounded bg-gray-200" />
              </div>
              <div className="relative">
                <div className="h-10 w-10 rounded-full" style={{ background: colorMap.secondary }} />
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-white" style={{ background: colorMap.success }} />
              </div>
            </div>
          </header>

          {/* Dashboard Content - White Background */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {[
                { label: 'Current MRR', value: '$12.4k', change: '+12.5%', trend: 'up', color: colorMap.cardAccent1 },
                { label: 'Current Customers', value: '16,601', change: '+8.2%', trend: 'up', color: colorMap.cardAccent2 },
                { label: 'Active Customers', value: '33%', change: '+15.3%', trend: 'up', color: colorMap.cardAccent3 },
                { label: 'Churn Rate', value: '2%', change: '-2.1%', trend: 'down', color: colorMap.cardAccent4 }
              ].map((stat, index) => (
                <div
                  key={index}
                  className="rounded-xl p-6 shadow-sm border border-gray-200 bg-white relative overflow-hidden"
                >
                  {/* Colored left border */}
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: stat.color }} />
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-3 w-24 rounded bg-gray-400" />
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: stat.color, opacity: 0.15 }}>
                      <div className="text-lg" style={{ color: stat.color }}>{stat.trend === 'up' ? '↑' : '↓'}</div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="text-3xl font-bold mb-1" style={{ color: stat.color }}>
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 rounded text-xs font-semibold text-white" style={{ background: stat.color }}>
                      {stat.change}
                    </div>
                    <div className="h-2 w-16 rounded-full overflow-hidden bg-gray-200">
                      <div className="h-full rounded-full" style={{ width: '75%', background: stat.color, opacity: 0.6 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Sales Donut */}
              <div className="rounded-xl p-6 shadow-sm border border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-6 w-24 rounded bg-gray-800" />
                  <div className="flex gap-1">
                    {colorMap.allColors.slice(0, 4).map((color, i) => (
                      <div key={i} className="h-3 w-3 rounded-full" style={{ background: color }} />
                    ))}
                  </div>
                </div>
                <div className="relative h-48 w-48 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-8 border-gray-200" />
                  {colorMap.allColors.slice(0, 4).map((color, i) => {
                    const startAngle = (i * 90) - 45;
                    const endAngle = ((i + 1) * 90) - 45;
                    return (
                      <div
                        key={i}
                        className="absolute inset-0 rounded-full"
                        style={{
                          clipPath: `polygon(50% 50%, ${50 + 40 * Math.cos(startAngle * Math.PI / 180)}% ${50 + 40 * Math.sin(startAngle * Math.PI / 180)}%, ${50 + 40 * Math.cos(endAngle * Math.PI / 180)}% ${50 + 40 * Math.sin(endAngle * Math.PI / 180)}%)`,
                          background: color
                        }}
                      />
                    );
                  })}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">342</div>
                      <div className="text-xs text-gray-500">SALES</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {['BASIC PLAN', 'PRO PLAN', 'ADVANCED PLAN', 'ENTERPRISE PLAN'].map((plan, i) => {
                    const planColor = colorMap.allColors[i % colorMap.allColors.length] || colorMap.primary;
                    return (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-4 rounded-full" style={{ background: planColor }} />
                          <div className="h-3 w-24 rounded bg-gray-300" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-12 rounded" style={{ background: planColor, opacity: 0.3 }} />
                          <div className="h-3 w-8 rounded" style={{ background: planColor, opacity: 0.8 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transactions List */}
              <div className="lg:col-span-2 rounded-xl p-6 shadow-sm border border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-6 w-32 rounded bg-gray-800" />
                  <div className="flex gap-2">
                    <div className="h-8 w-20 rounded" style={{ background: colorMap.accent, opacity: 0.3 }} />
                    <div className="h-8 w-24 rounded border" style={{ borderColor: colorMap.accent }} />
                  </div>
                </div>
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const badgeColor = colorMap.allColors[i % colorMap.allColors.length] || colorMap.primary;
                    const statusColors = [colorMap.success, colorMap.cardAccent2, colorMap.accent];
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition group"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold" style={{ background: badgeColor }}>
                              {['JD', 'SM', 'RK', 'AM', 'PT', 'LM'][i]}
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white" style={{ background: statusColors[i % statusColors.length] }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="h-4 w-28 rounded bg-gray-800" />
                              <div className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: badgeColor }}>
                                {['PRO', 'BASIC', 'ENTERPRISE', 'ADVANCED', 'PRO', 'BASIC'][i]}
                              </div>
                              {i < 2 && (
                                <div className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: colorMap.success, color: 'white', opacity: 0.9 }}>
                                  New
                                </div>
                              )}
                            </div>
                            <div className="h-3 w-36 rounded bg-gray-300 mb-1" />
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full" style={{ background: badgeColor, opacity: 0.6 }} />
                              <div className="h-2 w-20 rounded bg-gray-200" />
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="h-5 w-24 rounded mb-1.5 font-semibold" style={{ background: statusColors[i % statusColors.length], color: 'white', padding: '2px 8px', display: 'inline-block', fontSize: '12px' }}>
                            ${['299', '99', '599', '199', '299', '99'][i]}
                          </div>
                          <div className="h-3 w-20 rounded bg-gray-200" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className="w-full mt-4 py-3 rounded-lg text-white font-medium transition hover:opacity-90 shadow-md" style={{ background: colorMap.primary }}>
                  View all transactions
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
