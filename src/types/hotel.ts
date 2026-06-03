// Core types for the hotel experience. CMS-ready schema.

export type SceneId =
  | "arrival"
  | "reception"
  | "lobby"
  | "dining"
  | "spa"
  | "deck"
  | "garden"
  | "living"
  | "deluxe"
  | "executive"
  | "family"
  | "booking";

export interface CameraState {
  /** Yaw in radians (horizontal rotation). */
  yaw: number;
  /** Pitch in radians. Positive = looking up. */
  pitch: number;
  /** Vertical field of view in degrees. */
  fov: number;
}

export interface Hotspot {
  id: string;
  label: string;
  position: [number, number, number];
  target?: SceneId;
  kind: "room" | "amenity" | "scene";
  icon?: string;
}

export interface RoomDetails {
  id: string;
  name: string;
  tagline: string;
  description: string;
  size: string;
  occupancy: string;
  bedType: string;
  amenities: string[];
  view: string;
  priceFrom: number;
  currency: string;
  availability: "available" | "limited" | "unavailable";
  gallery: { src: string; alt: string }[];
  panorama: string;
}

export interface Amenity {
  id: string;
  title: string;
  description: string;
  icon: string;
  highlightIn: SceneId[];
}

export interface Scene {
  id: SceneId;
  index: number;
  name: string;
  kicker: string;
  /** Scroll progress 0..1 at which this scene is centered. */
  scrollAnchor: number;
  panorama: string;
  /**
   * Per-scene camera state. The yaw is GLOBAL and auto-rotates over time.
   * The pitch and fov are per-scene. `startYaw` is the yaw the camera
   * lerps to on scene entry, then pans/holds from there.
   */
  camera: { pitch: number; fov: number; startYaw?: number };
  /** Theme for the section. */
  theme: "dark" | "light";
  headline: string;
  body: string;
  hotspots: Hotspot[];
  room?: RoomDetails;
  amenities?: Amenity[];
}

export interface Hotel {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  location: {
    city: string;
    region: string;
    country: string;
    coordinates: { lat: number; lng: number };
  };
  contact: {
    phone: string;
    email: string;
    address: string;
    /** Google Maps search/place URL. */
    mapsUrl: string;
    /** Phone number used for wa.me link (digits only, with country code). */
    whatsapp: string;
    /** Path to a WhatsApp QR code image (e.g. /whatsapp-qr.png). */
    whatsappQr: string;
  };
  brand: {
    primary: string;
    secondary: string;
    accent: string;
  };
  scenes: Scene[];
  offers: {
    id: string;
    title: string;
    description: string;
    code?: string;
    discount?: string;
  }[];
  social: { label: string; href: string }[];
}
