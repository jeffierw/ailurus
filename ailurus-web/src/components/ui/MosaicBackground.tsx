import clsx from 'clsx';
import { useMemo } from 'react';

type MosaicBackgroundProps = {
  seed: string;
  className?: string;
  /** Grid dimension — 8 yields 64 cells. */
  size?: number;
};

/** Theme-aligned coral / rust / cream tones (matches --color-panda palette). */
const THEME_MOSAIC_PALETTE = [
  '#c45c4a',
  '#d4735f',
  '#8b3d32',
  '#e8a090',
  '#f5e6e3',
  '#f0d4cc',
  '#b85242',
  '#a84838',
  '#ddb8ae',
  '#c96b58',
  '#9e4538',
  '#efc9c0',
] as const;

/** Deterministic pixel-mosaic placeholder for locked / undecrypted media. */
export function MosaicBackground({ seed, className, size = 8 }: MosaicBackgroundProps) {
  const cells = useMemo(() => {
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }

    const count = size * size;
    return Array.from({ length: count }, (_, index) => {
      const mixed = (hash + index * 2_654_435_761) >>> 0;
      return THEME_MOSAIC_PALETTE[mixed % THEME_MOSAIC_PALETTE.length];
    });
  }, [seed, size]);

  return (
    <div
      className={clsx('absolute inset-0 grid', className)}
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {cells.map((color, index) => (
        <div key={index} style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}
