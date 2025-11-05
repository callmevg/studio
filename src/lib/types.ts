import { Timestamp } from "firebase/firestore";

export interface UIElement {
  id: string;
  name: string;
  isBuggy: boolean;
  bugDetails: string;
  mediaLink: string;
  createdAt: Timestamp;
  x?: number; // For D3 simulation
  y?: number; // For D3 simulation
  fx?: number | null; // For D3 fixed position
  fy?: number | null; // For D3 fixed position
}

export interface UIFlow {
  id: string;
  name: string;
  elementIds: string[];
  group?: string;
}
