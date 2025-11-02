export type PaletteMode =
  | 'random'
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'split'
  | 'gradient';

export type ColorInfoMode = 'hsl' | 'oklch';

export type PaletteColor = {
  id: string;
  hex: string;
  locked: boolean;
};

export type PaletteDocument = {
  id: string;
  name: string;
  project?: string;
  tags: string[];
  colors: string[];
  mode: PaletteMode;
  createdAt?: Date;
};
