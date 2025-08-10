export type PostType = "confirmed" | "misinformation" | "general";

export interface GeoLocation {
  lat: number;
  lng: number;
  name?: string;
}

export interface RawPost {
  id: string;
  timestamp: string; // ISO string
  text: string;
  location: GeoLocation;
  type: PostType;
  user?: string;
}

export interface ProcessedPost extends RawPost {
  category: PostType;
  diseases: string[];
  sentiment: {
    score: number; // -1..1
    label: "low" | "medium" | "high";
  };
  factCheck?: string;
}

export interface Hotspot {
  key: string;
  location: GeoLocation;
  intensity: number; // weighted
  posts: ProcessedPost[];
}
