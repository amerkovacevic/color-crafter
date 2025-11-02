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
  const [activeView, setActiveView] = useState<'dashboard' | 'learning' | 'mobile'>('dashboard');
  // Limit to maximum 6 colors
  const colors = palette.map((color) => color.hex).slice(0, 6);
  const colorMap = assignColors(colors);

  const handleGenerateNew = () => {
    const length = Math.min(palette.length || 5, 6);
    const newColors = Array.from({ length }, () => randomPleasantHex());
    const newPalette: PaletteColor[] = newColors.map((hex) => ({
      id: createColorId(),
      hex: hex,
      locked: false
    }));
    onPaletteChange(newPalette);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <div className="flex flex-col sm:flex-row h-auto sm:h-16 items-stretch sm:items-center justify-between border-b border-white/10 bg-slate-950/90 px-3 sm:px-4 md:px-6 lg:px-10 py-2 sm:py-0 backdrop-blur gap-2 sm:gap-0">
        <p className="hidden sm:block font-display text-base sm:text-lg md:text-xl lg:text-2xl font-semibold tracking-tight text-white truncate">Craft Visualizer</p>
        <div className="flex gap-1.5 sm:gap-2 bg-slate-800/50 p-1 rounded-lg overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-3 sm:px-3 lg:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              activeView === 'dashboard'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <span className="hidden sm:inline">CRM </span>Dashboard
          </button>
          <button
            onClick={() => setActiveView('learning')}
            className={`px-3 sm:px-3 lg:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              activeView === 'learning'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <span className="hidden sm:inline">Learning </span>Academy
          </button>
          <button
            onClick={() => setActiveView('mobile')}
            className={`px-3 sm:px-3 lg:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              activeView === 'mobile'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <span className="hidden sm:inline">Mobile </span>App
          </button>
        </div>
      </div>

      {/* Floating Generate Button & Palette Viewer */}
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-2 sm:gap-3">
        {showPaletteViewer && (
          <div className="rounded-2xl border border-white/20 bg-slate-900/95 backdrop-blur-md p-3 sm:p-4 shadow-2xl max-w-[calc(100vw-2rem)] sm:max-w-none">
            <div className="flex flex-wrap gap-2 sm:gap-2 mb-3 max-h-[200px] sm:max-h-none overflow-y-auto">
              {colors.map((hex, index) => (
                <div
                  key={index}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-white/20 cursor-pointer transition-transform hover:scale-110 active:scale-95 flex-shrink-0"
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
              className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition active:scale-95"
            >
              Close
            </button>
          </div>
        )}
        <button
          onClick={() => setShowPaletteViewer(!showPaletteViewer)}
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-2xl flex items-center justify-center text-white font-bold text-lg sm:text-xl transition-all hover:scale-110 active:scale-95 hover:shadow-teal-500/50"
          style={{ background: colorMap.primary, touchAction: 'manipulation' }}
          title="View Palette"
        >
          🎨
        </button>
        <button
          onClick={handleGenerateNew}
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-2xl flex items-center justify-center text-white font-bold text-lg sm:text-xl transition-all hover:scale-110 active:scale-95 hover:shadow-teal-500/50"
          style={{ background: colorMap.accent, touchAction: 'manipulation' }}
          title="Generate New Palette"
        >
          ✨
        </button>
      </div>

      <main className="flex flex-1 overflow-hidden bg-white">
        {activeView === 'dashboard' ? (
          <>
            {/* Sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0 border-r bg-white border-gray-200">
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
          <header className="h-16 border-b flex items-center justify-between px-4 sm:px-6 bg-white border-gray-200">
            <div className="flex items-center gap-2 sm:gap-4">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Dashboard</h1>
              <div className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium text-white" style={{ background: colorMap.accent }}>
                Live
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex h-9 w-32 lg:w-64 rounded-lg border border-gray-300 items-center gap-2 px-3 bg-white">
                <div className="h-4 w-4 rounded" style={{ background: colorMap.accent, opacity: 0.3 }} />
                <div className="h-3 w-20 lg:w-32 rounded bg-gray-200" />
              </div>
              <div className="relative">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" style={{ background: colorMap.secondary }} />
                <div className="absolute -top-1 -right-1 h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 border-white" style={{ background: colorMap.success }} />
              </div>
            </div>
          </header>

          {/* Dashboard Content - White Background */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
              {/* Color Palette Showcase */}
              <div className="rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-2">
                  <div className="h-6 w-32 rounded bg-gray-800" />
                  <div className="flex gap-1.5 sm:gap-1">
                    {colors.map((color, i) => (
                      <div key={i} className="h-4 w-4 sm:h-3 sm:w-3 rounded-full flex-shrink-0" style={{ background: color }} />
                    ))}
                  </div>
                </div>
                
                {/* Large Color Swatches */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3 mb-4">
                    {colors.map((color, i) => (
                      <div
                        key={i}
                        className="relative group rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                        style={{ aspectRatio: '1' }}
                      >
                        <div
                          className="w-full h-full"
                          style={{ background: color }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="text-white text-xs font-mono font-semibold drop-shadow-md px-2 py-1 rounded bg-black/30 backdrop-blur-sm">
                            {color.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Gradient Bar */}
                  <div className="h-8 rounded-lg overflow-hidden shadow-inner">
                    <div className="h-full flex">
                      {colors.map((color, i) => (
                        <div
                          key={i}
                          className="flex-1"
                          style={{ background: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Usage Examples */}
                <div className="space-y-3">
                  <div className="h-3 w-20 rounded bg-gray-400 mb-3" />
                  {colors.map((color, i) => {
                    const percentages = [90, 75, 65, 55, 45, 35];
                    const percentage = percentages[i] || 50;
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 sm:h-3 sm:w-3 rounded-full shadow-sm flex-shrink-0" style={{ background: color }} />
                            <div className="h-2 w-16 sm:w-20 rounded bg-gray-300" />
                          </div>
                          <div className="text-gray-500 font-medium">{percentage}%</div>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden bg-gray-200">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${percentage}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transactions List */}
              <div className="lg:col-span-2 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
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
                        className="flex items-center justify-between p-3 sm:p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition group"
                      >
                        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                          <div className="relative flex-shrink-0">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold" style={{ background: badgeColor }}>
                              {['JD', 'SM', 'RK', 'AM', 'PT', 'LM'][i]}
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 border-white" style={{ background: statusColors[i % statusColors.length] }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <div className="h-3 sm:h-4 w-20 sm:w-28 rounded bg-gray-800" />
                              <div className="px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: badgeColor }}>
                                {['PRO', 'BASIC', 'ENTERPRISE', 'ADVANCED', 'PRO', 'BASIC'][i]}
                              </div>
                              {i < 2 && (
                                <div className="px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium" style={{ background: colorMap.success, color: 'white', opacity: 0.9 }}>
                                  New
                                </div>
                              )}
                            </div>
                            <div className="h-3 w-28 sm:w-36 rounded bg-gray-300 mb-1" />
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full" style={{ background: badgeColor, opacity: 0.6 }} />
                              <div className="h-2 w-16 sm:w-20 rounded bg-gray-200" />
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="h-5 w-20 sm:w-24 rounded mb-1.5 font-semibold" style={{ background: statusColors[i % statusColors.length], color: 'white', padding: '2px 6px', display: 'inline-block', fontSize: '11px' }}>
                            ${['299', '99', '599', '199', '299', '99'][i]}
                          </div>
                          <div className="h-3 w-16 sm:w-20 rounded bg-gray-200" />
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
          </>
        ) : activeView === 'learning' ? (
          /* Learning Academy Landing Page */
          <div className="flex-1 overflow-y-auto bg-white">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg" style={{ background: colors[0] }} />
                  <div className="h-5 sm:h-6 w-24 sm:w-32 rounded bg-gray-900" />
                </div>
                
                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-4 lg:gap-6">
                  <div className="h-4 w-16 lg:w-20 rounded bg-gray-300" />
                  <button className="px-3 lg:px-4 py-2 rounded-lg border text-xs lg:text-sm font-medium hover:opacity-80 transition" style={{ borderColor: colorMap.accent, color: colorMap.accent }}>
                    <span className="hidden lg:inline">Explore Course List</span>
                    <span className="lg:hidden">Explore</span>
                  </button>
                  <button className="px-4 lg:px-6 py-2 rounded-lg text-xs lg:text-sm font-semibold text-white hover:opacity-90 transition shadow-lg" style={{ background: colors[0] }}>
                    Enroll Now
                  </button>
                </nav>
              </div>
            </header>

            {/* Hero Section */}
            <section className="relative bg-white overflow-hidden">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
                  {/* Left Column - Content */}
                  <div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 sm:mb-6 leading-tight">
                      <span className="text-gray-900">Unleash Your </span>
                      <span style={{ color: colors[2] }}>Creativity</span>
                      <br />
                      <span className="text-gray-900">with Top </span>
                      <span style={{ color: colors[2] }}>Design</span>
                      <span className="text-gray-900"> Courses</span>
                    </h1>
                    
                    <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 leading-relaxed">
                      Elevate your design skills to new heights with our curated selection of courses, designed to inspire, educate, and empower your creative journey.
                    </p>
                    
                    {/* Statistics */}
                    <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                      <div>
                        <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color: colorMap.accent }}>
                          300+
                        </div>
                        <div className="text-sm text-gray-600 font-medium">Courses</div>
                      </div>
                      <div>
                        <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color: colors[2] }}>
                          50+
                        </div>
                        <div className="text-sm text-gray-600 font-medium">Expert Mentors</div>
                      </div>
                      <div>
                        <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color: colors[3] }}>
                          1000+
                        </div>
                        <div className="text-sm text-gray-600 font-medium">Hours of Content</div>
                      </div>
                    </div>
                    
                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-wrap">
                      <button className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-sm sm:text-base font-semibold text-white shadow-xl hover:scale-105 transition-transform" style={{ background: colors[0] }}>
                        Start Learning
                      </button>
                      <button className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-sm sm:text-base font-semibold border-2 hover:scale-105 transition-transform" style={{ borderColor: colorMap.accent, color: colorMap.accent }}>
                        Browse Courses
                      </button>
                    </div>
                  </div>
                  
                  {/* Right Column - Geometric Graphics */}
                  <div className="relative h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px]">
                    {/* Abstract Geometric Shapes */}
                    <div className="absolute inset-0">
                      {/* Large rotated D shape - dark */}
                      <div 
                        className="absolute top-10 left-10 w-32 h-32 lg:w-40 lg:h-40 rounded-2xl transform rotate-12 shadow-xl"
                        style={{ background: colors[0] }}
                      />
                      
                      {/* Diamond - bright */}
                      <div 
                        className="absolute top-20 right-20 w-24 h-24 lg:w-32 lg:h-32 transform rotate-45 shadow-lg"
                        style={{ background: colors[1] }}
                      />
                      
                      {/* Large pink D shape */}
                      <div 
                        className="absolute top-32 left-32 lg:left-40 w-36 h-36 lg:w-48 lg:h-48 rounded-3xl transform -rotate-6 shadow-xl"
                        style={{ background: colors[2] }}
                      />
                      
                      {/* Hollow square outline */}
                      <div 
                        className="absolute top-16 right-32 lg:right-40 w-28 h-28 lg:w-36 lg:h-36 border-4 transform rotate-12"
                        style={{ borderColor: colors[2] }}
                      />
                      
                      {/* Light blue circle */}
                      <div 
                        className="absolute bottom-32 right-10 w-32 h-32 lg:w-40 lg:h-40 rounded-full shadow-xl"
                        style={{ background: colorMap.accent }}
                      />
                      
                      {/* Triangle outline */}
                      <div 
                        className="absolute bottom-20 left-24 lg:left-32 w-0 h-0 border-l-[30px] lg:border-l-[40px] border-r-[30px] lg:border-r-[40px] border-b-[52px] lg:border-b-[69px] border-l-transparent border-r-transparent transform rotate-12"
                        style={{ borderBottomColor: colorMap.accent }}
                      />
                      
                      {/* Bottom pink shape */}
                      <div 
                        className="absolute bottom-10 right-32 lg:right-40 w-40 h-32 lg:w-52 lg:h-40 rounded-2xl transform rotate-6 shadow-xl"
                        style={{ background: colors[2] }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : activeView === 'mobile' ? (
          /* Mobile Login Screens Showcase */
          <div className="flex-1 overflow-hidden bg-gray-100">
            <div className="h-full flex items-center justify-center py-6 px-4 sm:py-8 sm:px-6">
              <div className="max-w-7xl mx-auto w-full">
                {/* Title */}
                

                {/* Three Mobile Screens Side by Side */}
                <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 justify-center items-center">
                  {/* Screen 1: Splash/Welcome Screen */}
                  <div className="relative w-[320px] h-[640px] bg-white rounded-[3rem] shadow-2xl overflow-hidden" style={{ border: '12px solid #1a1a1a' }}>
                    {/* Top Section with Plants */}
                    <div className="absolute top-0 left-0 right-0 h-64" style={{ background: colorMap.accent }}>
                      <div className="absolute inset-0 bg-white/90 m-4 rounded-3xl p-6 flex items-end justify-between">
                        {/* Large Plant */}
                        <div className="w-24 h-32 flex items-end">
                          <div className="w-20 h-20 rounded-full" style={{ background: colors[2] }} />
                        </div>
                        {/* Small Plant */}
                        <div className="w-16 h-24 flex items-end">
                          <div className="w-14 h-14 rounded-full bg-white" />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="absolute bottom-0 left-0 right-0 h-80 bg-white rounded-t-[3rem] pt-8 px-6">
                      {/* Logo */}
                      <div className="flex items-center justify-center gap-2 mb-8">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: colors[3] }}>
                          <div className="w-6 h-6 rounded-full" style={{ background: colors[2] }} />
                        </div>
                        <div className="h-6 w-32 rounded bg-gray-900" />
                      </div>

                      {/* Buttons */}
                      <div className="space-y-4 mb-6">
                        <button className="w-full py-4 rounded-2xl font-semibold text-white shadow-lg" style={{ background: colors[2] }}>
                          Login
                        </button>
                        <button className="w-full py-4 rounded-2xl font-semibold text-white shadow-lg" style={{ background: colors[0] }}>
                          Register
                        </button>
                      </div>

                      {/* Guest Link */}
                      <div className="text-center">
                        <div className="text-sm" style={{ color: colors[2] }}>Continue as a guest</div>
                      </div>
                    </div>
                  </div>

                  {/* Screen 2: Login Screen */}
                  <div className="relative w-[320px] h-[640px] rounded-[3rem] shadow-2xl overflow-hidden" style={{ border: '12px solid #1a1a1a', background: '#faf9f6' }}>
                    {/* Content */}
                    <div className="absolute top-0 left-0 right-0 bottom-0 px-6 pt-3 pb-8 flex flex-col">
                      {/* Back Arrow */}
                      <div className="mb-6">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xl" style={{ color: colors[0] }}>←</div>
                      </div>

                      {/* Title */}
                      <h1 className="text-3xl font-bold mb-8">
                        <span style={{ color: colors[0] }}>Welcome</span> <span className="text-gray-900">back!</span><br />
                        <span className="text-gray-900">Glad to see you, Again!</span>
                      </h1>

                      {/* Input Fields */}
                      <div className="space-y-4 mb-6">
                        <div className="h-14 rounded-2xl border-2 flex items-center px-4 bg-white" style={{ borderColor: `${colors[0]}50` }}>
                          <div className="h-4 w-40 rounded bg-gray-300" />
                        </div>
                        <div className="h-14 rounded-2xl border-2 flex items-center justify-between px-4 bg-white" style={{ borderColor: `${colors[0]}50` }}>
                          <div className="h-4 w-32 rounded bg-gray-300" />
                          <div className="w-5 h-5 rounded bg-gray-300" />
                        </div>
                      </div>

                      {/* Forgot Password */}
                      <div className="text-right mb-6">
                        <div className="text-sm cursor-pointer hover:underline" style={{ color: colors[0] }}>Forgot Password?</div>
                      </div>

                      {/* Login Button */}
                      <button className="w-full py-4 rounded-2xl font-semibold text-white shadow-lg mb-6 transition hover:opacity-90" style={{ background: colors[0] }}>
                        Login
                      </button>

                      {/* Separator */}
                      <div className="text-center text-sm text-gray-500 mb-6">Or Login with</div>

                      {/* Social Login */}
                      <div className="flex gap-4 mb-6">
                        {/* Google */}
                        <button className="flex-1 h-12 rounded-2xl border-2 border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 transition">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-label="Google">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </button>
                        {/* Apple */}
                        <button className="flex-1 h-12 rounded-2xl border-2 border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 transition">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#000000" aria-label="Apple">
                            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                          </svg>
                        </button>
                        {/* GitHub */}
                        <button className="flex-1 h-12 rounded-2xl border-2 border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 transition">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#000000" aria-label="GitHub">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.425 22 12.017 22 6.484 17.522 2 12 2z"/>
                          </svg>
                        </button>
                      </div>

                      {/* Register Link */}
                      <div className="text-center text-sm text-gray-500">
                        Don't have an account? <span style={{ color: colors[2], fontWeight: 'bold' }}>Register Now</span>
                      </div>
                    </div>
                  </div>

                  {/* Screen 3: Register Screen */}
                  <div className="relative w-[320px] h-[640px] rounded-[3rem] shadow-2xl overflow-hidden" style={{ border: '12px solid #1a1a1a', background: '#faf9f6' }}>
                    {/* Content */}
                    <div className="absolute top-0 left-0 right-0 bottom-0 px-6 pt-3 pb-8 flex flex-col">
                      {/* Back Arrow */}
                      <div className="mb-6">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xl" style={{ color: colors[1] }}>←</div>
                      </div>

                      {/* Title */}
                      <h1 className="text-3xl font-bold mb-6">
                        <span style={{ color: colors[1] }}>Hello!</span><br />
                        <span className="text-gray-900">Register to get started</span>
                      </h1>

                      {/* Input Fields */}
                      <div className="space-y-3 mb-4">
                        <div className="h-12 rounded-2xl border-2 flex items-center px-4 bg-white" style={{ borderColor: `${colors[1]}50` }}>
                          <div className="h-4 w-36 rounded bg-gray-300" />
                        </div>
                        <div className="h-12 rounded-2xl border-2 flex items-center px-4 bg-white" style={{ borderColor: `${colors[1]}50` }}>
                          <div className="h-4 w-28 rounded bg-gray-300" />
                        </div>
                        <div className="h-12 rounded-2xl border-2 flex items-center justify-between px-4 bg-white" style={{ borderColor: `${colors[1]}50` }}>
                          <div className="h-4 w-32 rounded bg-gray-300" />
                          <div className="w-5 h-5 rounded bg-gray-300" />
                        </div>
                        <div className="h-12 rounded-2xl border-2 flex items-center justify-between px-4 bg-white" style={{ borderColor: `${colors[1]}50` }}>
                          <div className="h-4 w-40 rounded bg-gray-300" />
                          <div className="w-5 h-5 rounded bg-gray-300" />
                        </div>
                      </div>

                      {/* Register Button */}
                      <button className="w-full py-4 rounded-2xl font-semibold text-white shadow-lg mb-4 transition hover:opacity-90" style={{ background: colors[1] }}>
                        Register
                      </button>

                      {/* Separator */}
                      <div className="text-center text-sm text-gray-500 mb-4">Or Register with</div>

                      {/* Social Login */}
                      <div className="flex gap-4 mb-4">
                        {/* Google */}
                        <button className="flex-1 h-12 rounded-2xl border-2 border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 transition">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-label="Google">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </button>
                        {/* Apple */}
                        <button className="flex-1 h-12 rounded-2xl border-2 border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 transition">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#000000" aria-label="Apple">
                            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                          </svg>
                        </button>
                        {/* GitHub */}
                        <button className="flex-1 h-12 rounded-2xl border-2 border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 transition">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#000000" aria-label="GitHub">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.425 22 12.017 22 6.484 17.522 2 12 2z"/>
                          </svg>
                        </button>
                      </div>

                      {/* Login Link */}
                      <div className="text-center text-sm text-gray-500">
                        Already have an account? <span style={{ color: colors[2], fontWeight: 'bold' }}>Login Now</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
