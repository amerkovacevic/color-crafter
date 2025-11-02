import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import type { ColorInfoMode, PaletteColor } from '../types';
import { formatHslString, formatOklchString, getReadableTextColor, isValidHex, normalizeHex } from '../lib/color-utils';

type PaletteSwatchProps = {
  color: PaletteColor;
  index: number;
  infoMode: ColorInfoMode;
  onInfoModeChange: (mode: ColorInfoMode) => void;
  onToggleLock: (id: string) => void;
  onCopy: (hex: string) => void;
  onDelete: (index: number) => void;
  onInsert: (index: number) => void;
  onHexChange: (id: string, hex: string) => void;
  maxSwatchesReached?: boolean;
};

export function PaletteSwatch({
  color,
  index,
  infoMode,
  onInfoModeChange,
  onToggleLock,
  onCopy,
  onDelete,
  onInsert,
  onHexChange,
  maxSwatchesReached = false
}: PaletteSwatchProps) {
  const [editingHex, setEditingHex] = useState(color.hex);
  const textColor = getReadableTextColor(color.hex);
  const infoText = infoMode === 'hsl' ? formatHslString(color.hex) : formatOklchString(color.hex);

  useEffect(() => {
    setEditingHex(color.hex);
  }, [color.hex]);

  const handleHexBlur = () => {
    if (isValidHex(editingHex)) {
      onHexChange(color.id, normalizeHex(editingHex));
    } else {
      setEditingHex(color.hex);
    }
  };

  return (
    <div
      className="group relative flex min-h-[400px] flex-1 basis-full flex-col transition sm:min-h-[500px] sm:basis-0"
      style={{ background: color.hex }}
    >
      <div className="relative z-10 flex h-full flex-col items-center justify-between px-6 py-8 text-white">
        <div className="flex flex-1 flex-col items-center justify-center gap-5 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2">
          <button
            type="button"
            onClick={() => onToggleLock(color.id)}
            className={classNames(
              'grid h-16 w-16 place-items-center rounded-full border-2 bg-white/20 backdrop-blur-md text-2xl shadow-xl transition-all duration-200 hover:scale-110 hover:bg-white/30 hover:shadow-2xl',
              {
                'ring-4 ring-white/90 ring-offset-4 ring-offset-transparent scale-105': color.locked
              }
            )}
            style={{ color: textColor, borderColor: `${textColor}80` }}
            aria-label={color.locked ? 'Unlock swatch' : 'Lock swatch'}
          >
            {color.locked ? '🔒' : '🔓'}
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onCopy(color.hex)}
              className="grid h-14 w-14 place-items-center rounded-full border-2 bg-white/15 backdrop-blur-md text-xl shadow-lg transition-all duration-200 hover:scale-110 hover:bg-white/25 hover:shadow-xl"
              style={{ color: textColor, borderColor: `${textColor}60` }}
              aria-label="Copy hex"
            >
              📋
            </button>
            <label
              className="grid h-14 w-14 cursor-pointer place-items-center rounded-full border-2 bg-white/15 backdrop-blur-md text-xl shadow-lg transition-all duration-200 hover:scale-110 hover:bg-white/25 hover:shadow-xl"
              style={{ color: textColor, borderColor: `${textColor}60` }}
              aria-label="Pick colour"
            >
              🎨
              <input
                type="color"
                value={color.hex}
                onChange={(event) => onHexChange(color.id, normalizeHex(event.target.value))}
                className="sr-only"
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            {!maxSwatchesReached && (
              <button
                type="button"
                onClick={() => onInsert(index)}
                className="grid h-12 w-12 place-items-center rounded-full border-2 bg-white/15 backdrop-blur-md text-lg font-semibold shadow-lg transition-all duration-200 hover:scale-110 hover:bg-white/25 hover:shadow-xl"
                style={{ color: textColor, borderColor: `${textColor}60` }}
                aria-label="Insert swatch after"
              >
                ➕
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(index)}
              className="grid h-12 w-12 place-items-center rounded-full border-2 bg-white/15 backdrop-blur-md text-lg font-semibold shadow-lg transition-all duration-200 hover:scale-110 hover:bg-white/25 hover:shadow-xl"
              style={{ color: textColor, borderColor: `${textColor}60` }}
              aria-label="Delete swatch"
            >
              ➖
            </button>
          </div>
        </div>
        <div className="w-full space-y-5 text-center">
          <input
            value={editingHex}
            onChange={(event) => setEditingHex(event.target.value)}
            onBlur={handleHexBlur}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleHexBlur();
              }
            }}
            className="w-full bg-transparent text-center text-3xl font-bold uppercase tracking-[0.5em] outline-none transition-all duration-200 hover:tracking-[0.6em] focus:tracking-[0.6em]"
            style={{ color: textColor }}
          />
          <div className="opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1">
            <p className="text-base font-semibold tracking-wide mb-3" style={{ color: textColor }}>
              {infoText}
            </p>
            <div className="flex justify-center gap-2">
              <button
                className={classNames(
                  'rounded-full px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-200 border-2 backdrop-blur-md shadow-lg hover:scale-105',
                  infoMode === 'hsl'
                    ? 'bg-white/25 text-white border-white/40 shadow-xl'
                    : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15'
                )}
                onClick={() => onInfoModeChange('hsl')}
                style={{ color: textColor }}
              >
                HSL
              </button>
              <button
                className={classNames(
                  'rounded-full px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-200 border-2 backdrop-blur-md shadow-lg hover:scale-105',
                  infoMode === 'oklch'
                    ? 'bg-white/25 text-white border-white/40 shadow-xl'
                    : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15'
                )}
                onClick={() => onInfoModeChange('oklch')}
                style={{ color: textColor }}
              >
                OKLCH
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
