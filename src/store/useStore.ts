import { create } from "zustand";
import type { SceneId, Hotel } from "@/types/hotel";
import { hotel as defaultHotel } from "@/content/houseboat-canberra";

export interface PmsRoom {
  id: number;
  name: string;
  units: number;
  basePrice: number;
  currentPrice: number;
  maxAdults: number;
  maxChildren: number;
  childPolicy: string;
}

export interface PmsSeason {
  start_date: string;
  end_date: string;
  multiplier: number;
}

export interface PmsMealPlan {
  code: string;
  name: string;
  price: number;
}

export interface PmsData {
  property: Record<string, string>;
  rooms: PmsRoom[];
  seasons: PmsSeason[];
  mealPlans: PmsMealPlan[];
  blockedDates: Record<number, string[]>;
}

interface SceneState {
  hotel: Hotel;
  yaw: number;
  currentIndex: number;
  transitionProgress: number;
  scrollProgress: number;
  effectiveFov: number;
  freeLook: boolean;
  showBooking: boolean;
  showRoom: boolean;
  selectedRoomId: string | null;
  soundEnabled: boolean;

  pms: PmsData | null;
  pmsLoading: boolean;

  setScrollState: (p: number, currentIndex: number, transition: number, fov: number) => void;
  setYaw: (y: number) => void;
  jumpToScene: (id: SceneId) => void;
  toggleBooking: (v?: boolean) => void;
  toggleRoom: (id?: string | null) => void;
  toggleSound: () => void;
  toggleFreeLook: () => void;
  fetchPms: () => Promise<void>;
}

export const useStore = create<SceneState>((set) => ({
  hotel: defaultHotel,
  yaw: 0,
  currentIndex: 0,
  transitionProgress: 0,
  scrollProgress: 0,
  effectiveFov: 60,
  freeLook: false,
  showBooking: false,
  showRoom: false,
  selectedRoomId: null,
  soundEnabled: false,

  pms: null,
  pmsLoading: true,

  setScrollState: (p, currentIndex, transition, fov) =>
    set({ scrollProgress: p, currentIndex, transitionProgress: transition, effectiveFov: fov }),
  setYaw: (y) => set({ yaw: y }),
  jumpToScene: (id) => {
    const hotel = useStore.getState().hotel;
    const i = hotel.scenes.findIndex((s) => s.id === id);
    if (i >= 0) {
      const target = document.getElementById(`scene-${id}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  },
  toggleBooking: (v) => set((s) => ({ showBooking: v ?? !s.showBooking })),
  toggleRoom: (id) =>
    set((s) => ({
      showRoom: id !== undefined ? id !== null : !s.showRoom,
      selectedRoomId: id === undefined ? s.selectedRoomId : id,
    })),
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  toggleFreeLook: () => set((s) => ({ freeLook: !s.freeLook })),
  fetchPms: async () => {
    set({ pmsLoading: true });
    try {
      const res = await fetch("/api/pms");
      if (!res.ok) throw new Error("Failed to fetch PMS");
      const data: PmsData = await res.json();
      set({ pms: data, pmsLoading: false });
    } catch {
      set({ pmsLoading: false });
    }
  },
}));
