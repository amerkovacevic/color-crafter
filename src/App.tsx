import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { PaletteSwatch } from './components/PaletteSwatch';
import {
  createColorId,
  generateGradientPalette,
  generatePaletteByMode,
  normalizeHex,
  randomPleasantHex
} from './lib/color-utils';
import { googleSignIn, listenToAuth, logOut } from './lib/firebase';
import type { ColorInfoMode, PaletteColor, PaletteMode } from './types';
import { usePaletteStorage } from './hooks/usePaletteStorage';

const DEFAULT_HEXES = ['#0f172a', '#0f766e', '#14b8a6', '#38bdf8', '#f472b6'];

const MODE_OPTIONS: { value: PaletteMode; label: string; description: string }[] = [
  { value: 'random', label: 'Random Muse', description: 'Pleasing random colours tuned for balanced palettes.' },
  { value: 'complementary', label: 'Complementary', description: 'Opposites attract with subtle lightness offsets.' },
  { value: 'analogous', label: 'Analogous', description: 'Neighbouring hues for flowing gradients.' },
  { value: 'triadic', label: 'Triadic', description: 'Three evenly spaced hues with accent tints.' },
  { value: 'tetradic', label: 'Tetradic', description: 'Four-corner harmony for bold compositions.' },
  { value: 'split', label: 'Split-Complementary', description: 'Balanced contrast with softened complements.' },
  { value: 'gradient', label: 'Gradient', description: 'Interpolate between two anchors in OKLCH space.' }
];

function createPaletteFromHexes(hexes: string[]): PaletteColor[] {
  return hexes.map((hex) => ({ id: createColorId(), hex: normalizeHex(hex), locked: false }));
}

function parsePaletteFromUrl(): {
  palette: PaletteColor[];
  mode: PaletteMode;
  infoMode: ColorInfoMode;
  gradientStart: string;
  gradientEnd: string;
  gradientSteps: number;
} {
  if (typeof window === 'undefined') {
    return {
      palette: createPaletteFromHexes(DEFAULT_HEXES),
      mode: 'random',
      infoMode: 'hsl',
      gradientStart: '#2563eb',
      gradientEnd: '#f97316',
      gradientSteps: 5
    };
  }

  const params = new URLSearchParams(window.location.search);
  const colorsParam = params.get('colors');
  const modeParam = params.get('mode');
  const infoParam = params.get('info');
  const gradientParam = params.get('gradient');

  const parsedMode = MODE_OPTIONS.find((option) => option.value === modeParam)?.value ?? 'random';
  const parsedInfo = infoParam === 'oklch' ? 'oklch' : 'hsl';

  let palette = createPaletteFromHexes(DEFAULT_HEXES);
  if (colorsParam) {
    const colors = colorsParam
      .split('-')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => `#${value.replace('#', '')}`);
    if (colors.length > 0) {
      palette = createPaletteFromHexes(colors);
    }
  }

  let gradientStart = '#2563eb';
  let gradientEnd = '#f97316';
  let gradientSteps = 5;
  if (gradientParam) {
    const [start, end, steps] = gradientParam.split('_');
    if (start) gradientStart = `#${start.replace('#', '')}`;
    if (end) gradientEnd = `#${end.replace('#', '')}`;
    const parsedSteps = Number.parseInt(steps ?? '5', 10);
    if (!Number.isNaN(parsedSteps) && parsedSteps > 1 && parsedSteps < 12) {
      gradientSteps = parsedSteps;
    }
  }

  return { palette, mode: parsedMode, infoMode: parsedInfo, gradientStart, gradientEnd, gradientSteps };
}

function App() {
  const initialState = useMemo(() => parsePaletteFromUrl(), []);
  const [palette, setPalette] = useState<PaletteColor[]>(initialState.palette);
  const [mode, setMode] = useState<PaletteMode>(initialState.mode);
  const [infoMode, setInfoMode] = useState<ColorInfoMode>(initialState.infoMode);
  const [gradientStart, setGradientStart] = useState(initialState.gradientStart);
  const [gradientEnd, setGradientEnd] = useState(initialState.gradientEnd);
  const [gradientSteps, setGradientSteps] = useState(initialState.gradientSteps);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [paletteName, setPaletteName] = useState('Untitled Harmony');
  const [projectName, setProjectName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [generatorBusy, setGeneratorBusy] = useState(false);

  useEffect(() => {
    return listenToAuth(setUser);
  }, []);

  const { palettes: savedPalettes, savePalette, deletePaletteById, loading: savedLoading, error: savedError } =
    usePaletteStorage(user);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    params.set('colors', palette.map((color) => color.hex.replace('#', '')).join('-'));
    params.set('mode', mode);
    params.set('info', infoMode);
    if (mode === 'gradient') {
      params.set(
        'gradient',
        `${gradientStart.replace('#', '')}_${gradientEnd.replace('#', '')}_${gradientSteps.toString()}`
      );
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [palette, mode, infoMode, gradientStart, gradientEnd, gradientSteps]);

  const targetLength = mode === 'gradient' ? gradientSteps : palette.length || 5;

  const generatePalette = useCallback(
    (nextMode?: PaletteMode) => {
      const activeMode = nextMode ?? mode;
      const length = activeMode === 'gradient' ? gradientSteps : targetLength;
      const baseColor = palette.find((color) => color.locked)?.hex ?? palette[0]?.hex ?? randomPleasantHex();

      setGeneratorBusy(true);
      const runner = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : (fn: FrameRequestCallback) =>
            setTimeout(() => fn(typeof performance !== 'undefined' ? performance.now() : Date.now()), 0);

      runner(() => {
        const generatedColors =
          activeMode === 'gradient'
            ? generateGradientPalette(gradientStart, gradientEnd, length)
            : generatePaletteByMode(baseColor, activeMode, length);

        const nextPalette: PaletteColor[] = Array.from({ length }, (_, index) => {
          const existing = palette[index];
          const candidate = generatedColors[index % generatedColors.length] ?? randomPleasantHex();
          if (existing && existing.locked) {
            return existing;
          }
          return {
            id: existing?.id ?? createColorId(),
            hex: candidate,
            locked: existing?.locked ?? false
          };
        });

        setPalette(nextPalette);
        setGeneratorBusy(false);
      });
    },
    [gradientEnd, gradientStart, gradientSteps, mode, palette, targetLength]
  );

  useEffect(() => {
    if (mode === 'gradient') {
      generatePalette('gradient');
    }
  }, [mode, gradientStart, gradientEnd, gradientSteps, generatePalette]);

  const handleCopy = useCallback((hex: string) => {
    if (typeof navigator === 'undefined') return;
    navigator.clipboard.writeText(hex).then(() => {
      setCopySuccess(`Copied ${hex}`);
      setTimeout(() => setCopySuccess(null), 1600);
    });
  }, []);

  const toggleLock = useCallback(
    (id: string) => {
      setPalette((current) => current.map((color) => (color.id === id ? { ...color, locked: !color.locked } : color)));
    },
    [setPalette]
  );

  const updateHex = useCallback((id: string, hex: string) => {
    setPalette((current) => current.map((color) => (color.id === id ? { ...color, hex } : color)));
  }, []);

  const insertAfter = useCallback(
    (index: number) => {
      setPalette((current) => {
        const next = [...current];
        next.splice(index + 1, 0, { id: createColorId(), hex: randomPleasantHex(), locked: false });
        return next;
      });
    },
    []
  );

  const deleteAt = useCallback((index: number) => {
    setPalette((current) => {
      if (current.length <= 2) return current;
      const next = current.slice(0, index).concat(current.slice(index + 1));
      return next.length === 0 ? createPaletteFromHexes(DEFAULT_HEXES) : next;
    });
  }, []);

  const paletteSummary = useMemo(
    () => palette.map((color) => color.hex).join(', '),
    [palette]
  );

  const tags = useMemo(
    () =>
      tagInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tagInput]
  );

  const handleSavePalette = async () => {
    try {
      await savePalette({
        name: paletteName || 'Untitled Harmony',
        project: projectName || undefined,
        tags,
        colors: palette.map((color) => color.hex),
        mode
      });
      setPaletteName('Untitled Harmony');
      setProjectName('');
      setTagInput('');
      setCopySuccess('Palette saved ✨');
      setTimeout(() => setCopySuccess(null), 1600);
    } catch (error: any) {
      console.error('Save palette error:', error);
      const errorMessage = error?.message || 'Unable to save palette';
      setCopySuccess(errorMessage);
      setTimeout(() => setCopySuccess(null), 4000);
    }
  };

  const firebaseReady = typeof window !== 'undefined' && Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex h-16 items-center justify-between border-b border-white/10 bg-slate-950/90 px-6 backdrop-blur sm:px-10">
        <div className="flex items-baseline gap-4">
          <p className="font-display text-2xl font-semibold tracking-tight text-white">Color Crafter</p>
          <span className="hidden text-xs uppercase tracking-[0.35em] text-slate-400 sm:inline">Palette Studio</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden text-slate-300 sm:inline">{user.displayName ?? user.email}</span>
              <button onClick={logOut} className="button-secondary">Sign out</button>
            </>
          ) : (
            <button onClick={googleSignIn} className="button-primary">
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex min-h-[340px] flex-1 flex-col sm:flex-row">
              {palette.map((color, index) => (
                <PaletteSwatch
                  key={color.id}
                  color={color}
                  index={index}
                  infoMode={infoMode}
                  onInfoModeChange={setInfoMode}
                  onToggleLock={toggleLock}
                  onCopy={handleCopy}
                  onDelete={deleteAt}
                  onInsert={insertAfter}
                  onHexChange={updateHex}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-slate-950/85 px-6 py-10 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-3xl text-white">Generator controls</h2>
                <p className="text-sm text-slate-300">Lock favourites, remix harmonies, share in a heartbeat.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={mode}
                  onChange={(event) => {
                    const value = event.target.value as PaletteMode;
                    setMode(value);
                    if (value !== 'gradient') {
                      generatePalette(value);
                    }
                  }}
                  className="rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-100 focus:border-teal-400 focus:outline-none"
                >
                  {MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => generatePalette()}
                  className="button-primary"
                  disabled={generatorBusy}
                >
                  {generatorBusy ? 'Mixing…' : 'Regenerate'}
                </button>
              </div>
            </div>

            <div className="grid gap-10 lg:grid-cols-[3fr,2fr]">
              <div className="space-y-8">
                <p className="text-sm text-slate-300">
                  {MODE_OPTIONS.find((option) => option.value === mode)?.description}
                </p>
                {mode === 'gradient' && (
                  <div className="grid gap-6 sm:grid-cols-3">
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="text-slate-300">Start colour</span>
                      <input
                        type="color"
                        value={gradientStart}
                        onChange={(event) => setGradientStart(event.target.value)}
                        className="h-14 w-full cursor-pointer rounded-2xl border border-white/10 bg-slate-900/60"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="text-slate-300">End colour</span>
                      <input
                        type="color"
                        value={gradientEnd}
                        onChange={(event) => setGradientEnd(event.target.value)}
                        className="h-14 w-full cursor-pointer rounded-2xl border border-white/10 bg-slate-900/60"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="text-slate-300">Steps</span>
                      <input
                        type="range"
                        min={3}
                        max={10}
                        value={gradientSteps}
                        onChange={(event) => setGradientSteps(Number(event.target.value))}
                      />
                      <span className="text-xs text-slate-400">{gradientSteps} swatches</span>
                    </label>
                  </div>
                )}
                <div>
                  <h3 className="text-xs uppercase tracking-[0.35em] text-slate-500">Palette summary</h3>
                  <p className="mt-3 text-lg font-medium text-slate-100">{paletteSummary}</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6">
                  <h2 className="font-display text-2xl text-white">Save your palette</h2>
                  <div className="grid gap-4">
                    <label className="text-sm text-slate-300">
                      Palette name
                      <input
                        value={paletteName}
                        onChange={(event) => setPaletteName(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white focus:border-teal-400 focus:outline-none"
                        placeholder="Dreamy sunset"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      Project (optional)
                      <input
                        value={projectName}
                        onChange={(event) => setProjectName(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white focus:border-teal-400 focus:outline-none"
                        placeholder="Brand Refresh"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      Tags (comma separated)
                      <input
                        value={tagInput}
                        onChange={(event) => setTagInput(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white focus:border-teal-400 focus:outline-none"
                        placeholder="web, ui, cool"
                      />
                    </label>
                  </div>
                  <button
                    onClick={handleSavePalette}
                    className="button-primary"
                    disabled={!user || !firebaseReady}
                  >
                    {firebaseReady ? (user ? 'Save palette' : 'Sign in to save') : 'Add Firebase config to enable saves'}
                  </button>
                  {!firebaseReady && (
                    <p className="text-xs text-amber-300">
                      Firebase configuration missing. Copy <code>.env.example</code> to <code>.env</code> and add your credentials.
                    </p>
                  )}
                  {savedError && <p className="text-xs text-rose-300">{savedError}</p>}
                </div>

                <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl text-white">Your library</h3>
                    {savedLoading && <span className="text-xs text-slate-400">Loading…</span>}
                  </div>
                  {savedPalettes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-sm text-slate-400">
                      Saved palettes will appear here with project and tag filters for quick browsing.
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {savedPalettes.map((saved) => (
                        <article
                          key={saved.id}
                          className="group rounded-2xl border border-white/10 bg-slate-950/70 p-4 transition hover:border-teal-400/60"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <h4 className="font-semibold text-white">{saved.name}</h4>
                              {saved.project && <p className="text-xs uppercase tracking-wide text-slate-400">{saved.project}</p>}
                            </div>
                            <button
                              type="button"
                              className="button-secondary text-xs"
                              onClick={() => deletePaletteById(saved.id)}
                            >
                              Delete
                            </button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {saved.colors.map((hex) => (
                              <span
                                key={hex}
                                className="rounded-full px-3 py-1 text-xs font-semibold"
                                style={{ background: hex, color: '#0f172a' }}
                              >
                                {hex}
                              </span>
                            ))}
                          </div>
                          {saved.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-teal-200">
                              {saved.tags.map((tag) => (
                                <span key={tag} className="rounded-full bg-teal-500/10 px-2 py-1 uppercase tracking-wide">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {copySuccess && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center">
          <div className="rounded-full bg-slate-900/90 px-4 py-2 text-sm font-medium text-white shadow-glow">
            {copySuccess}
          </div>
        </div>
      )}

      <footer className="border-t border-white/5 bg-slate-950/90 py-6 text-center text-xs text-slate-500">
        Crafted with 🧪 gradients & harmonies. Shareable URL ready for your next pitch.
      </footer>
    </div>
  );
}

export default App;
