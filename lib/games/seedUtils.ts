/**
 * Deterministic random number generator using seed
 * Based on Linear Congruential Generator (LCG)
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    // Convert hex seed to number
    this.seed = parseInt(seed.slice(2, 10), 16);
  }

  /**
   * Generate next random number between 0 and 1
   */
  next(): number {
    // LCG parameters (from Numerical Recipes)
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    
    this.seed = (a * this.seed + c) % m;
    return this.seed / m;
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random float between min and max
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

/**
 * Generate deterministic pipe heights for Flappy Bird
 */
export function generatePipeSequence(seed: string, count: number): number[] {
  const rng = new SeededRandom(seed);
  const pipes: number[] = [];
  
  const minHeight = 20; // Minimum pipe height percentage
  const maxHeight = 70; // Maximum pipe height percentage
  
  for (let i = 0; i < count; i++) {
    pipes.push(rng.nextInt(minHeight, maxHeight));
  }
  
  return pipes;
}