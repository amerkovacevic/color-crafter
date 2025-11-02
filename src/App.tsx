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
import { getFirebase, googleSignIn, listenToAuth, logOut } from './lib/firebase';
import type { ColorInfoMode, PaletteColor, PaletteMode } from './types';
import { usePaletteStorage } from './hooks/usePaletteStorage';

const DEFAULT_HEXES = ['#0f172a', '#0f766e', '#14b8a6', '#38bdf8', '#f472b6'];

const MODE_OPTIONS: { value: PaletteMode; label: string; description: string }[] = [
  { value: 'random', label: 'Random', description: 'Generate a fresh, balanced palette with curated randomness.' },
  { value: 'complementary', label: 'Complementary', description: 'Opposites attract with subtle lightness offsets.' },
  { value: 'analogous', label: 'Analogous', description: 'Neighbouring hues for flowing gradients.' },
  { value: 'triadic', label: 'Triadic', description: 'Three evenly spaced hues with accent tints.' },
  { value: 'tetradic', label: 'Tetradic', description: 'Four-corner harmony for bold compositions.' },
  { value: 'split', label: 'Split Complementary', description: 'Balanced contrast with softened complements.' },
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

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  const stored = window.localStorage.getItem('colorcrafter-theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  return prefersDark ? 'dark' : 'light';
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
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const isLightMode = theme === 'light';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.dataset.theme = theme;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('colorcrafter-theme', theme);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    return listenToAuth(setUser);
  }, []);

  const { palettes: savedPalettes, savePalette, deletePaletteById, loading: savedLoading, error: savedError } =
    usePaletteStorage(user);

  const firebaseReady = useMemo(() => (typeof window === 'undefined' ? false : Boolean(getFirebase())), []);

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

  const generatePalette = useCallback(
    (nextMode?: PaletteMode) => {
      const activeMode = nextMode ?? mode;
      setGeneratorBusy(true);

      const runGeneration = () => {
        try {
          setPalette((current) => {
            const length = activeMode === 'gradient' ? gradientSteps : current.length || 5;
            const baseColor =
              current.find((color) => color.locked)?.hex ?? current[0]?.hex ?? randomPleasantHex();
            const generatedColors =
              activeMode === 'gradient'
                ? generateGradientPalette(gradientStart, gradientEnd, length)
                : generatePaletteByMode(baseColor, activeMode, length);

            return Array.from({ length }, (_, index) => {
              const existing = current[index];
              const candidate = generatedColors[index % generatedColors.length] ?? randomPleasantHex();
              if (existing && existing.locked) {
                return existing;
              }
              return {
                id: existing?.id ?? createColorId(),
                hex: candidate,
                locked: existing?.locked ?? false
              } satisfies PaletteColor;
            });
          });
        } catch (error) {
          console.error(error);
        } finally {
          setGeneratorBusy(false);
        }
      };

      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(runGeneration);
      } else {
        setTimeout(runGeneration, 0);
      }
    },
    [gradientEnd, gradientStart, gradientSteps, mode]
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
    } catch (error) {
      console.error(error);
      setCopySuccess('Unable to save palette');
      setTimeout(() => setCopySuccess(null), 1600);
    }
  };

  return (
    <div
      className={`flex min-h-screen flex-col transition-colors ${isLightMode ? 'bg-white text-slate-900' : 'bg-slate-950 text-slate-100'}`}
      data-theme={theme}
    >
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 text-slate-900 backdrop-blur transition-colors dark:border-white/10 dark:bg-slate-950/90 dark:text-slate-100 sm:px-10">
        <div className="flex items-baseline gap-4">
          <p className="font-display text-2xl font-semibold tracking-tight text-slate-900 transition-colors dark:text-white">Color Crafter</p>
          <span className="hidden text-xs uppercase tracking-[0.35em] text-slate-500 transition-colors dark:text-slate-400 sm:inline">Palette Studio</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={toggleTheme}
            className="button-secondary"
            aria-pressed={isLightMode}
            aria-label={`Switch to ${isLightMode ? 'dark' : 'light'} mode`}
          >
            {isLightMode ? '🌙 Dark mode' : '☀️ Light mode'}
          </button>
          {user ? (
            <>
              <span className="hidden text-slate-600 transition-colors dark:text-slate-300 sm:inline">{user.displayName ?? user.email}</span>
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

        <section className="border-t border-slate-200 bg-white/85 px-6 py-10 backdrop-blur transition-colors dark:border-white/10 dark:bg-slate-950/85">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-3xl text-slate-900 transition-colors dark:text-white">Generator controls</h2>
                <p className="text-sm text-slate-600 transition-colors dark:text-slate-300">Lock favourites, remix harmonies, share in a heartbeat.</p>
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
                  className="rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-800 transition focus:border-teal-500 focus:outline-none dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
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
                <p className="text-sm text-slate-600 transition-colors dark:text-slate-300">
                  {MODE_OPTIONS.find((option) => option.value === mode)?.description}
                </p>
                {mode === 'gradient' && (
                  <div className="grid gap-6 sm:grid-cols-3">
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="text-slate-600 transition-colors dark:text-slate-300">Start colour</span>
                      <input
                        type="color"
                        value={gradientStart}
                        onChange={(event) => setGradientStart(event.target.value)}
                        className="h-14 w-full cursor-pointer rounded-2xl border border-slate-300 bg-white/70 transition-colors dark:border-white/10 dark:bg-slate-900/60"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="text-slate-600 transition-colors dark:text-slate-300">End colour</span>
                      <input
                        type="color"
                        value={gradientEnd}
                        onChange={(event) => setGradientEnd(event.target.value)}
                        className="h-14 w-full cursor-pointer rounded-2xl border border-slate-300 bg-white/70 transition-colors dark:border-white/10 dark:bg-slate-900/60"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="text-slate-600 transition-colors dark:text-slate-300">Steps</span>
                      <input
                        type="range"
                        min={3}
                        max={10}
                        value={gradientSteps}
                        onChange={(event) => setGradientSteps(Number(event.target.value))}
                      />
                      <span className="text-xs text-slate-500 transition-colors dark:text-slate-400">{gradientSteps} swatches</span>
                    </label>
                  </div>
                )}
                <div>
                  <h3 className="text-xs uppercase tracking-[0.35em] text-slate-500 transition-colors dark:text-slate-500">Palette summary</h3>
                  <p className="mt-3 text-lg font-medium text-slate-900 transition-colors dark:text-slate-100">{paletteSummary}</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-6 transition-colors dark:border-white/10 dark:bg-slate-900/60">
                  <h2 className="font-display text-2xl text-slate-900 transition-colors dark:text-white">Save your palette</h2>
                  <div className="grid gap-4">
                    <label className="text-sm text-slate-600 transition-colors dark:text-slate-300">
                      Palette name
                      <input
                        value={paletteName}
                        onChange={(event) => setPaletteName(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white/90 px-4 py-3 text-sm text-slate-900 transition-colors focus:border-teal-500 focus:outline-none dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                        placeholder="Dreamy sunset"
                      />
                    </label>
                    <label className="text-sm text-slate-600 transition-colors dark:text-slate-300">
                      Project (optional)
                      <input
                        value={projectName}
                        onChange={(event) => setProjectName(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white/90 px-4 py-3 text-sm text-slate-900 transition-colors focus:border-teal-500 focus:outline-none dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                        placeholder="Brand Refresh"
                      />
                    </label>
                    <label className="text-sm text-slate-600 transition-colors dark:text-slate-300">
                      Tags (comma separated)
                      <input
                        value={tagInput}
                        onChange={(event) => setTagInput(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white/90 px-4 py-3 text-sm text-slate-900 transition-colors focus:border-teal-500 focus:outline-none dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
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
                    <p className="text-xs text-amber-600 transition-colors dark:text-amber-300">
                      Firebase configuration missing. Update <code>src/lib/firebase-config.json</code> or provide VITE_FIREBASE_* environment values.
                    </p>
                  )}
                  {savedError && <p className="text-xs text-rose-500 transition-colors dark:text-rose-300">{savedError}</p>}
                </div>

                <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-6 transition-colors dark:border-white/10 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl text-slate-900 transition-colors dark:text-white">Your library</h3>
                    {savedLoading && <span className="text-xs text-slate-500 transition-colors dark:text-slate-400">Loading…</span>}
                  </div>
                  {savedPalettes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-500 transition-colors dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-400">
                      Saved palettes will appear here with project and tag filters for quick browsing.
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {savedPalettes.map((saved) => (
                        <article
                          key={saved.id}
                          className="group rounded-2xl border border-slate-200 bg-white/80 p-4 transition hover:border-teal-400/40 dark:border-white/10 dark:bg-slate-950/70 dark:hover:border-teal-400/60"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <h4 className="font-semibold text-slate-900 transition-colors dark:text-white">{saved.name}</h4>
                              {saved.project && (
                                <p className="text-xs uppercase tracking-wide text-slate-500 transition-colors dark:text-slate-400">
                                  {saved.project}
                                </p>
                              )}
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
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-teal-600 transition-colors dark:text-teal-200">
                              {saved.tags.map((tag) => (
                                <span key={tag} className="rounded-full bg-teal-100 px-2 py-1 uppercase tracking-wide transition-colors dark:bg-teal-500/10">
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
          <div className="rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-slate-900 shadow-glow transition-colors dark:bg-slate-900/90 dark:text-white">
            {copySuccess}
          </div>
        </div>
      )}

      <footer className="border-t border-slate-200 bg-white/90 py-6 text-center text-xs text-slate-500 transition-colors dark:border-white/5 dark:bg-slate-950/90 dark:text-slate-400">
        Crafted with 🧪 gradients & harmonies. Shareable URL ready for your next pitch.
      </footer>
    </div>
  );
}

export default App;
