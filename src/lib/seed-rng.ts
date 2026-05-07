export function seededRandom(seed: number): (index: number) => number {
  return (index: number) => {
    const x = Math.sin(seed * 9301 + index * 49297) * 233280;
    return x - Math.floor(x);
  };
}
