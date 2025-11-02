import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { getFirebase } from '../lib/firebase';
import type { PaletteDocument, PaletteMode } from '../types';

export type SavePalettePayload = {
  name: string;
  project?: string;
  tags: string[];
  colors: string[];
  mode: PaletteMode;
};

export function usePaletteStorage(user: User | null) {
  const [palettes, setPalettes] = useState<PaletteDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const firebase = getFirebase();
    if (!firebase || !user) {
      setPalettes([]);
      setError(null);
      return;
    }

    const { db } = firebase;
    
    // Try the query with orderBy first (requires index)
    // If it fails, we'll fall back to a simpler query
    const paletteQuery = query(
      collection(db, 'colorCrafter_palettes'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    setLoading(true);
    setError(null);
    
    const unsubscribe = onSnapshot(
      paletteQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name ?? 'Untitled Palette',
            project: data.project ?? undefined,
            tags: Array.isArray(data.tags) ? data.tags : [],
            colors: Array.isArray(data.colors) ? data.colors : [],
            mode: (data.mode ?? 'random') as PaletteMode,
            createdAt: data.createdAt?.toDate?.()
          } satisfies PaletteDocument;
        });
        // Sort manually as fallback if createdAt is available
        docs.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
        setPalettes(docs);
        setLoading(false);
        setError(null);
      },
      (snapshotError: any) => {
        console.error('Firestore query error:', snapshotError);
        // Check for common error codes
        if (snapshotError?.code === 'failed-precondition') {
          // This usually means the index is missing
          const errorMsg = 'Firestore index missing. Click the error link in console to create it, or create manually: colorCrafter_palettes collection with userId (Ascending) and createdAt (Descending).';
          setError(errorMsg);
          console.error('To create the index, visit:', snapshotError.message);
        } else if (snapshotError?.code === 'permission-denied') {
          setError('Permission denied. Make sure Firestore security rules are deployed and allow authenticated users to read their own palettes.');
        } else if (snapshotError?.message) {
          setError(`Failed to load palettes: ${snapshotError.message}`);
        } else {
          setError('Failed to load palettes. Check browser console for details.');
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const savePalette = useCallback(
    async (payload: SavePalettePayload) => {
      const firebase = getFirebase();
      if (!firebase) {
        throw new Error('Firebase is not configured');
      }
      if (!user) {
        throw new Error('You need to be signed in to save palettes');
      }
      const { db } = firebase;
      try {
        await addDoc(collection(db, 'colorCrafter_palettes'), {
          ...payload,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      } catch (error: any) {
        console.error('Firestore save error:', error);
        // Provide more specific error messages
        if (error?.code === 'permission-denied') {
          throw new Error('Permission denied. Check Firestore security rules.');
        } else if (error?.code === 'unavailable') {
          throw new Error('Firestore is temporarily unavailable. Please try again.');
        } else if (error?.message) {
          throw new Error(`Failed to save: ${error.message}`);
        } else {
          throw new Error('Failed to save palette. Check console for details.');
        }
      }
    },
    [user]
  );

  const deletePaletteById = useCallback(
    async (paletteId: string) => {
      const firebase = getFirebase();
      if (!firebase) return;
      const { db } = firebase;
      await deleteDoc(doc(db, 'colorCrafter_palettes', paletteId));
    },
    []
  );

  return { palettes, savePalette, deletePaletteById, loading, error };
}
