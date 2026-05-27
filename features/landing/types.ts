export interface PortfolioImage {
  id: string;
  url: string;
  title: string;
  category: string; // e.g., "Car", "Animal", "Portrait", "Architecture", "Nature", "Abstract"
  aspectRatio: string; // e.g., "aspect-[3/4]", "aspect-[1/1]", "aspect-[4/5]", "aspect-[2/3]"
  color: string; // 'warm', 'cool', 'neutral', 'colorful'
  tags: string[];
}

export interface FilterState {
  search: string;
  color: string;
  aspectRatio: string;
  people: string;
  focalPoint: string;
  luminance: string;
  sortBy: string;
}
