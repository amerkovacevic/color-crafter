import { useEffect, useState } from 'react';
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
  onHexChange
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
      className="relative flex min-h-[260px] flex-1 basis-full flex-col transition sm:min-h-0 sm:basis-0"
      style={{ background: color.hex }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-black/15 via-black/0 to-black/30" />
      <div className="relative z-10 flex h-full flex-col items-center justify-between px-6 py-8 text-white">
        <div className="flex w-full justify-start text-[0.65rem] font-semibold uppercase tracking-[0.35em]" style={{ color: textColor }}>
          <span className="opacity-70">Swatch {index + 1}</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => onToggleLock(color.id)}
            className={classNames(
              'grid h-14 w-14 place-items-center rounded-full border bg-white/15 text-2xl shadow-lg backdrop-blur transition hover:bg-white/25',
              {
                'ring-2 ring-white/80 ring-offset-2 ring-offset-white/10': color.locked
              }
            )}
            style={{ color: textColor, borderColor: textColor }}
            aria-label={color.locked ? 'Unlock swatch' : 'Lock swatch'}
          >
            {color.locked ? '🔒' : '🔓'}
          </button>
          <button
            type="button"
            onClick={() => onCopy(color.hex)}
            className="grid h-12 w-12 place-items-center rounded-full border border-white/40 bg-black/25 text-xl shadow-md transition hover:bg-black/35"
            style={{ color: textColor, borderColor: textColor }}
            aria-label="Copy hex"
          >
            📋
          </button>
          <label
            className="grid h-12 w-12 cursor-pointer place-items-center rounded-full border border-white/40 bg-black/25 text-xl shadow-md transition hover:bg-black/35"
            style={{ color: textColor, borderColor: textColor }}
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onInsert(index)}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/40 bg-black/25 text-lg font-semibold shadow-md transition hover:bg-black/35"
              style={{ color: textColor, borderColor: textColor }}
              aria-label="Insert swatch after"
            >
              ➕
            </button>
            <button
              type="button"
              onClick={() => onDelete(index)}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/40 bg-black/25 text-lg font-semibold shadow-md transition hover:bg-black/35"
              style={{ color: textColor, borderColor: textColor }}
              aria-label="Delete swatch"
            >
              ➖
            </button>
          </div>
        </div>
        <div className="w-full space-y-4 text-center">
          <input
            value={editingHex}
            onChange={(event) => setEditingHex(event.target.value)}
            onBlur={handleHexBlur}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleHexBlur();
              }
            }}
            className="w-full bg-transparent text-2xl font-semibold uppercase tracking-[0.4em] outline-none"
            style={{ color: textColor }}
          />
          <p className="text-sm font-medium" style={{ color: textColor }}>
            {infoText}
          </p>
          <div className="flex justify-center gap-3 text-[0.65rem] font-semibold uppercase tracking-[0.35em]" style={{ color: textColor }}>
            <button
              className={classNames('rounded-full px-4 py-1 transition', {
                'bg-black/35 text-white': infoMode === 'hsl'
              })}
              onClick={() => onInfoModeChange('hsl')}
            >
              HSL
            </button>
            <button
              className={classNames('rounded-full px-4 py-1 transition', {
                'bg-black/35 text-white': infoMode === 'oklch'
              })}
              onClick={() => onInfoModeChange('oklch')}
            >
              OKLCH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
