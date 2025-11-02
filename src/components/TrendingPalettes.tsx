import React, { useEffect, useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { getFirebase } from '../lib/firebase';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { createColorId, normalizeHex } from '../lib/color-utils';
import type { PaletteColor } from '../types';

function createPaletteFromHexes(hexes: string[]): PaletteColor[] {
  return hexes.map((hex) => ({ id: createColorId(), hex: normalizeHex(hex), locked: false }));
}

export type SharedPalette = {
  id: string;
  name: string;
  colors: string[];
  userId: string;
  userName: string;
  userPhotoURL?: string;
  upvotes: number;
  downvotes: number;
  upvotedBy: string[];
  downvotedBy: string[];
  createdAt?: Date;
  viewCount: number;
};

type TrendingPalettesProps = {
  onLoadPalette: (colors: string[]) => void;
  user: User | null;
};

export function TrendingPalettes({ onLoadPalette, user }: TrendingPalettesProps) {
  const [palettes, setPalettes] = useState<SharedPalette[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const firebase = getFirebase();
    if (!firebase) {
      setError('Firebase is not configured');
      setLoading(false);
      return;
    }

    const { db } = firebase;
    
    // Query shared palettes ordered by net score (upvotes - downvotes), then by creation time
    const sharedQuery = query(
      collection(db, 'colorCrafter_sharedPalettes'),
      orderBy('upvotes', 'desc')
    );

    setLoading(true);
    const unsubscribe = onSnapshot(
      sharedQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name ?? 'Untitled Palette',
            colors: Array.isArray(data.colors) ? data.colors : [],
            userId: data.userId ?? '',
            userName: data.userName ?? 'Anonymous',
            userPhotoURL: data.userPhotoURL ?? undefined,
            upvotes: data.upvotes ?? 0,
            downvotes: data.downvotes ?? 0,
            upvotedBy: Array.isArray(data.upvotedBy) ? data.upvotedBy : [],
            downvotedBy: Array.isArray(data.downvotedBy) ? data.downvotedBy : [],
            createdAt: data.createdAt?.toDate?.(),
            viewCount: data.viewCount ?? 0
          } satisfies SharedPalette;
        });
        
        // Sort by net score (upvotes - downvotes) descending, then by createdAt
        docs.sort((a, b) => {
          const scoreA = (a.upvotes - a.downvotes);
          const scoreB = (b.upvotes - b.downvotes);
          if (scoreA !== scoreB) return scoreB - scoreA;
          if (a.createdAt && b.createdAt) {
            return b.createdAt.getTime() - a.createdAt.getTime();
          }
          return 0;
        });
        
        setPalettes(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error loading shared palettes:', err);
        setError('Failed to load trending palettes');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleVote = useCallback(
    async (paletteId: string, voteType: 'upvote' | 'downvote') => {
      if (!user) {
        alert('Please sign in to vote');
        return;
      }

      const firebase = getFirebase();
      if (!firebase) return;

      const { db } = firebase;
      const paletteRef = doc(db, 'colorCrafter_sharedPalettes', paletteId);
      
      try {
        const paletteDoc = await getDoc(paletteRef);
        if (!paletteDoc.exists()) return;

        const data = paletteDoc.data();
        const upvotedBy = Array.isArray(data.upvotedBy) ? data.upvotedBy : [];
        const downvotedBy = Array.isArray(data.downvotedBy) ? data.downvotedBy : [];

        const hasUpvoted = upvotedBy.includes(user.uid);
        const hasDownvoted = downvotedBy.includes(user.uid);

        let updates: any = {};

        if (voteType === 'upvote') {
          if (hasUpvoted) {
            // Remove upvote
            updates.upvotedBy = arrayRemove(user.uid);
            updates.upvotes = Math.max(0, (data.upvotes || 0) - 1);
          } else {
            // Add upvote, remove downvote if exists
            updates.upvotedBy = arrayUnion(user.uid);
            updates.upvotes = (data.upvotes || 0) + 1;
            if (hasDownvoted) {
              updates.downvotedBy = arrayRemove(user.uid);
              updates.downvotes = Math.max(0, (data.downvotes || 0) - 1);
            }
          }
        } else {
          // downvote
          if (hasDownvoted) {
            // Remove downvote
            updates.downvotedBy = arrayRemove(user.uid);
            updates.downvotes = Math.max(0, (data.downvotes || 0) - 1);
          } else {
            // Add downvote, remove upvote if exists
            updates.downvotedBy = arrayUnion(user.uid);
            updates.downvotes = (data.downvotes || 0) + 1;
            if (hasUpvoted) {
              updates.upvotedBy = arrayRemove(user.uid);
              updates.upvotes = Math.max(0, (data.upvotes || 0) - 1);
            }
          }
        }

        await updateDoc(paletteRef, updates);
      } catch (error) {
        console.error('Error voting:', error);
        alert('Failed to vote. Please try again.');
      }
    },
    [user]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
        <div className="flex h-16 items-center justify-center border-b border-white/10">
          <p className="font-display text-2xl font-semibold tracking-tight text-white">Trending Color Crafts</p>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-slate-400">Loading trending palettes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
        <div className="flex h-16 items-center justify-center border-b border-white/10">
          <p className="font-display text-2xl font-semibold tracking-tight text-white">Trending Color Crafts</p>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-rose-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <div className="flex h-16 items-center justify-between border-b border-white/10 bg-slate-950/90 px-6 backdrop-blur sm:px-10">
        <p className="font-display text-2xl font-semibold tracking-tight text-white">Trending Color Crafts</p>
        {user && (
          <span className="text-sm text-slate-300">{user.displayName ?? user.email}</span>
        )}
      </div>

      <main className="flex flex-1 flex-col">
        <section className="border-t border-white/10 bg-slate-950/85 px-6 py-10 backdrop-blur">
          <div className="mx-auto w-full max-w-6xl">
            {palettes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-12 text-center">
                <p className="text-lg text-slate-400">No shared palettes yet.</p>
                <p className="mt-2 text-sm text-slate-500">Be the first to share a palette!</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {palettes.map((palette) => {
                  const hasUpvoted = user && palette.upvotedBy.includes(user.uid);
                  const hasDownvoted = user && palette.downvotedBy.includes(user.uid);
                  const netScore = palette.upvotes - palette.downvotes;

                  return (
                    <article
                      key={palette.id}
                      className="group cursor-pointer rounded-2xl border border-white/10 bg-slate-950/70 p-6 transition hover:border-teal-400/60"
                      onClick={() => onLoadPalette(palette.colors)}
                    >
                      <div className="mb-4">
                        <h3 className="font-semibold text-white">{palette.name}</h3>
                        <div className="mt-2 flex items-center gap-2">
                          {palette.userPhotoURL ? (
                            <img
                              src={palette.userPhotoURL}
                              alt={palette.userName}
                              className="h-6 w-6 rounded-full"
                            />
                          ) : null}
                          <span className="text-xs text-slate-400">{palette.userName}</span>
                        </div>
                      </div>

                      <div className="mb-4 flex gap-1 rounded-lg overflow-hidden">
                        {palette.colors.map((hex, index) => (
                          <div
                            key={`${palette.id}-${index}`}
                            className="flex-1 aspect-square"
                            style={{ background: hex }}
                            title={hex}
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVote(palette.id, 'upvote');
                            }}
                            className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm transition ${
                              hasUpvoted
                                ? 'bg-teal-500/20 text-teal-300'
                                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                            }`}
                            disabled={!user}
                            title={user ? 'Upvote' : 'Sign in to vote'}
                          >
                            <span>▲</span>
                            <span>{palette.upvotes}</span>
                          </button>
                          <span className="text-sm font-semibold text-slate-300">{netScore}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVote(palette.id, 'downvote');
                            }}
                            className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm transition ${
                              hasDownvoted
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                            }`}
                            disabled={!user}
                            title={user ? 'Downvote' : 'Sign in to vote'}
                          >
                            <span>▼</span>
                            <span>{palette.downvotes}</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLoadPalette(palette.colors);
                          }}
                          className="button-secondary text-xs"
                        >
                          Use Palette
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

