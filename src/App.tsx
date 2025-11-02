import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { PaletteSwatch } from './components/PaletteSwatch';
import { TrendingPalettes } from './components/TrendingPalettes';
import { CraftVisualizer } from './components/CraftVisualizer';
import {
  createColorId,
  normalizeHex,
  randomPleasantHex
} from './lib/color-utils';
import { googleSignIn, listenToAuth, logOut, getFirebase } from './lib/firebase';
import type { ColorInfoMode, PaletteColor } from './types';
import { usePaletteStorage } from './hooks/usePaletteStorage';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

const DEFAULT_HEXES = ['#0f172a', '#0f766e', '#14b8a6', '#38bdf8', '#f472b6'];


export function createPaletteFromHexes(hexes: string[]): PaletteColor[] {
  // Limit to maximum 6 colors
  const limitedHexes = hexes.slice(0, 6);
  return limitedHexes.map((hex) => ({ id: createColorId(), hex: normalizeHex(hex), locked: false }));
}

function parsePaletteFromUrl(): {
  palette: PaletteColor[];
  infoMode: ColorInfoMode;
} {
  if (typeof window === 'undefined') {
    return {
      palette: createPaletteFromHexes(DEFAULT_HEXES),
      infoMode: 'hsl'
    };
  }

  const params = new URLSearchParams(window.location.search);
  const colorsParam = params.get('colors');
  const infoParam = params.get('info');
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

  return { palette, infoMode: parsedInfo };
}

function App() {
  const initialState = useMemo(() => parsePaletteFromUrl(), []);
  const [palette, setPalette] = useState<PaletteColor[]>(initialState.palette);
  const [infoMode, setInfoMode] = useState<ColorInfoMode>(initialState.infoMode);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [paletteName, setPaletteName] = useState('Untitled Harmony');
  const [projectName, setProjectName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [generatorBusy, setGeneratorBusy] = useState(false);
  const [currentPage, setCurrentPage] = useState<'generator' | 'trending' | 'visualizer'>('generator');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    return listenToAuth(setUser);
  }, []);

  const { palettes: savedPalettes, savePalette, deletePaletteById, loading: savedLoading, error: savedError } =
    usePaletteStorage(user);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    params.set('colors', palette.map((color) => color.hex.replace('#', '')).join('-'));
    params.set('info', infoMode);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [palette, infoMode]);

  const generatePalette = useCallback(() => {
    const length = Math.min(palette.length || 5, 6); // Maximum 6 swatches

    setGeneratorBusy(true);
    const runner = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (fn: FrameRequestCallback) =>
          setTimeout(() => fn(typeof performance !== 'undefined' ? performance.now() : Date.now()), 0);

    runner(() => {
      // Always generate random colors
      const generatedColors = Array.from({ length }, () => randomPleasantHex());

      const nextPalette: PaletteColor[] = Array.from({ length }, (_, index) => {
        const existing = palette[index];
        const candidate = generatedColors[index] ?? randomPleasantHex();
        if (existing && existing.locked) {
          return existing;
        }
        return {
          id: existing?.id ?? createColorId(),
          hex: candidate,
          locked: existing?.locked ?? false
        };
      }).slice(0, 6); // Limit to maximum 6 swatches

      setPalette(nextPalette);
      setGeneratorBusy(false);
    });
  }, [palette]);

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
        // Maximum of 6 swatches allowed
        if (current.length >= 6) {
          return current;
        }
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
        mode: 'random'
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

  const handleSharePalette = async () => {
    if (!user) {
      alert('Please sign in to share palettes');
      return;
    }

    const firebase = getFirebase();
    if (!firebase) {
      setCopySuccess('Firebase is not configured');
      setTimeout(() => setCopySuccess(null), 3000);
      return;
    }

    try {
      const { db } = firebase;
      const paletteColors = palette.map((color) => color.hex);
      
      // Check if user has already shared this exact palette (same colors)
      const existingQuery = query(
        collection(db, 'colorCrafter_sharedPalettes'),
        where('userId', '==', user.uid),
        where('colors', '==', paletteColors)
      );
      
      const existingDocs = await getDocs(existingQuery);
      if (!existingDocs.empty) {
        setCopySuccess('You have already shared this palette');
        setTimeout(() => setCopySuccess(null), 3000);
        return;
      }

      await addDoc(collection(db, 'colorCrafter_sharedPalettes'), {
        name: paletteName || 'Untitled Harmony',
        colors: paletteColors,
        userId: user.uid,
        userName: user.displayName || user.email || 'Anonymous',
        userPhotoURL: user.photoURL || undefined,
        upvotes: 0,
        downvotes: 0,
        upvotedBy: [],
        downvotedBy: [],
        viewCount: 0,
        createdAt: serverTimestamp()
      });
      setCopySuccess('Palette shared to Trending ✨');
      setTimeout(() => setCopySuccess(null), 3000);
    } catch (error: any) {
      console.error('Share palette error:', error);
      const errorMessage = error?.message || 'Unable to share palette';
      setCopySuccess(errorMessage);
      setTimeout(() => setCopySuccess(null), 4000);
    }
  };

  const handleLoadPalette = useCallback((colors: string[]) => {
    const loadedPalette = createPaletteFromHexes(colors);
    setPalette(loadedPalette);
    setCurrentPage('generator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePageChange = useCallback((page: 'generator' | 'trending' | 'visualizer') => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
  }, []);

  const firebaseReady = typeof window !== 'undefined' && Boolean((import.meta as any).env?.VITE_FIREBASE_API_KEY);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="relative border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 md:px-10">
          <p className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-white truncate">Color Crafter</p>
          
          {/* Desktop Navigation & Auth */}
          <div className="hidden sm:flex items-center gap-4">
            <nav className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange('generator')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  currentPage === 'generator'
                    ? 'bg-teal-500/20 text-teal-300'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                Generator
              </button>
              <button
                type="button"
                onClick={() => handlePageChange('trending')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  currentPage === 'trending'
                    ? 'bg-teal-500/20 text-teal-300'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                Trending
              </button>
              <button
                type="button"
                onClick={() => handlePageChange('visualizer')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  currentPage === 'visualizer'
                    ? 'bg-teal-500/20 text-teal-300'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                Visualizer
              </button>
            </nav>
            <div className="flex items-center gap-3 text-sm">
              {user ? (
                <>
                  <span className="text-slate-300">{user.displayName ?? user.email}</span>
                  <button onClick={logOut} className="button-secondary">Sign out</button>
                </>
              ) : (
                <button onClick={googleSignIn} className="button-primary">
                  Sign in with Google
                </button>
              )}
            </div>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden p-2 rounded-lg text-white hover:bg-slate-800/50 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur">
            <nav className="flex flex-col py-2">
              <button
                type="button"
                onClick={() => handlePageChange('generator')}
                className={`px-4 py-3 text-left text-sm font-medium transition ${
                  currentPage === 'generator'
                    ? 'bg-teal-500/20 text-teal-300'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                Generator
              </button>
              <button
                type="button"
                onClick={() => handlePageChange('trending')}
                className={`px-4 py-3 text-left text-sm font-medium transition ${
                  currentPage === 'trending'
                    ? 'bg-teal-500/20 text-teal-300'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                Trending
              </button>
              <button
                type="button"
                onClick={() => handlePageChange('visualizer')}
                className={`px-4 py-3 text-left text-sm font-medium transition ${
                  currentPage === 'visualizer'
                    ? 'bg-teal-500/20 text-teal-300'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                Visualizer
              </button>
            </nav>
            <div className="border-t border-white/10 px-4 py-3">
              {user ? (
                <div className="space-y-3">
                  <div className="text-sm text-slate-300 truncate">{user.displayName ?? user.email}</div>
                  <button onClick={logOut} className="w-full button-secondary text-sm">
                    Sign out
                  </button>
                </div>
              ) : (
                <button onClick={googleSignIn} className="w-full button-primary text-sm">
                  Sign in with Google
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {currentPage === 'trending' ? (
        <TrendingPalettes onLoadPalette={handleLoadPalette} user={user} />
      ) : currentPage === 'visualizer' ? (
        <CraftVisualizer palette={palette} onPaletteChange={setPalette} />
      ) : (
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
                  maxSwatchesReached={palette.length >= 6}
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
                <button
                  type="button"
                  onClick={() => generatePalette()}
                  className="button-primary"
                  disabled={generatorBusy}
                >
                  Generate Palette
                </button>
              </div>
            </div>

            <div className="grid gap-10 lg:grid-cols-[3fr,2fr]">
              <div className="space-y-8">
                <p className="text-sm text-slate-300">
                  Generate pleasing random colors tuned for balanced palettes. Lock your favorites and regenerate to discover new harmonies.
                </p>
                <div>
                  <h3 className="text-xs uppercase tracking-[0.35em] text-slate-500">Palette summary</h3>
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <div className="flex gap-1.5">
                      {palette.map((color, index) => (
                        <div
                          key={color.id}
                          className="w-8 h-8 rounded-lg border-2 border-white/10 shadow-sm flex-shrink-0 cursor-pointer transition-transform hover:scale-110"
                          style={{ background: color.hex }}
                          onClick={() => handleCopy(color.hex)}
                          title={color.hex}
                        />
                      ))}
                    </div>
                    <p className="text-lg font-medium text-slate-100">{paletteSummary}</p>
                  </div>
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
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleSavePalette}
                      className="button-primary"
                      disabled={!user || !firebaseReady}
                    >
                      {firebaseReady ? (user ? 'Save' : 'Sign in') : 'No Firebase'}
                    </button>
                    <button
                      onClick={handleSharePalette}
                      className="button-secondary"
                      disabled={!user || !firebaseReady}
                    >
                      Share
                    </button>
                  </div>
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
                          className="group cursor-pointer rounded-2xl border border-white/10 bg-slate-950/70 p-4 transition hover:border-teal-400/60"
                          onClick={() => {
                            // Load saved palette
                            const loadedPalette = createPaletteFromHexes(saved.colors);
                            setPalette(loadedPalette);
                            // Populate name, project, and tags from saved palette
                            setPaletteName(saved.name);
                            setProjectName(saved.project || '');
                            setTagInput(saved.tags.join(', '));
                            // Scroll to top to show the palette
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-white">{saved.name}</h4>
                              {saved.project && <p className="text-xs uppercase tracking-wide text-slate-400">{saved.project}</p>}
                            </div>
                            <button
                              type="button"
                              className="button-secondary text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePaletteById(saved.id);
                              }}
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
      )}

      {copySuccess && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center">
          <div className="rounded-full bg-slate-900/90 px-4 py-2 text-sm font-medium text-white shadow-glow">
            {copySuccess}
          </div>
        </div>
      )}

      <footer className="border-t border-slate-800 bg-slate-900/80 py-4 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Amer Kovacevic All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
