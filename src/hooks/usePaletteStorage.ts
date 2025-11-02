import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
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
      return;
    }

    const { db } = firebase;
    const paletteCollection = collection(db, 'users', user.uid, 'apps', 'amer-colorcrafter', 'palettes');
    const paletteQuery = query(paletteCollection, orderBy('createdAt', 'desc'));

    setLoading(true);
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
        setPalettes(docs);
        setLoading(false);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError('Failed to load palettes');
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
      await addDoc(collection(db, 'users', user.uid, 'apps', 'amer-colorcrafter', 'palettes'), {
        ...payload,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    },
    [user]
  );

  const deletePaletteById = useCallback(
    async (paletteId: string) => {
      if (!user) return;
      const firebase = getFirebase();
      if (!firebase) return;
      const { db } = firebase;
      await deleteDoc(doc(db, 'users', user.uid, 'apps', 'amer-colorcrafter', 'palettes', paletteId));
    },
    [user]
  );

  return { palettes, savePalette, deletePaletteById, loading, error };
}
