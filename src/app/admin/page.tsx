"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Tab = "bookings" | "rooms" | "seasons" | "meal-plans";

interface Room {
  id: number; name: string; units: number; base_price: number; max_adults: number; max_children: number; child_policy: string;
}
interface Season { start_date: string; end_date: string; multiplier: number; }
interface MealPlan { code: string; name: string; price: number; }
interface Booking { id: string; booking_ref: string; guest_name: string; phone: string; email: string; room_name: string; check_in: string; check_out: string; adults: number; children: number; units: number; amount: number; status: string; created_at: string; }

const PASSWORD_KEY = "admin_token";

function useAdmin() {
  const [token, setToken] = useState("");
  const [tab, setTab] = useState<Tab>("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [meals, setMeals] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem(PASSWORD_KEY);
    if (saved) setToken(saved);
  }, []);

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const fetchAll = useCallback(async (t: Tab) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin?resource=${t}`, { headers: headers() });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (t === "bookings") setBookings(data);
      else if (t === "rooms") setRooms(data);
      else if (t === "seasons") setSeasons(data);
      else if (t === "meal-plans") setMeals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  useEffect(() => { if (token) fetchAll(tab); }, [token, tab, fetchAll]);

  const save = useCallback(async (resource: string, data: unknown) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ resource, data }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchAll(tab);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }, [headers, fetchAll, tab]);

  return { token, setToken, tab, setTab, bookings, rooms, seasons, meals, loading, error, fetchAll, save, headers };
}

export default function AdminPage() {
  const { token, setToken, tab, setTab, bookings, rooms, seasons, meals, loading, error, fetchAll, save } = useAdmin();

  if (!token) return <Login onLogin={(t) => { setToken(t); sessionStorage.setItem(PASSWORD_KEY, t); }} />;

  const tabs: { id: Tab; label: string }[] = [
    { id: "bookings", label: "Bookings" },
    { id: "rooms", label: "Rooms" },
    { id: "seasons", label: "Seasons" },
    { id: "meal-plans", label: "Meal Plans" },
  ];

  return (
    <main className="min-h-screen bg-[#0A0D0C] text-white">
      <header className="border-b border-white/10 bg-[#0A0D0C]/90 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xs uppercase tracking-[0.4em] text-white/50 hover:text-white" style={{ fontFamily: "var(--font-display)" }}>Houseboat Canberra</Link>
          <span className="text-[10px] uppercase tracking-[0.45em] text-[#C8A86B]" style={{ fontFamily: "var(--font-display)" }}>Admin</span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>Dashboard</h1>
          <button onClick={() => { setToken(""); sessionStorage.removeItem(PASSWORD_KEY); }} className="rounded-full border border-white/20 px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-white/50 hover:text-white">Logout</button>
        </div>

        <div className="mb-8 flex gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-lg py-2.5 text-[10px] uppercase tracking-[0.3em] transition ${tab === t.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`} style={{ fontFamily: "var(--font-display)" }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-white/50 py-8 text-center">Loading...</p>}
        {error && <p className="text-sm text-rose-300 mb-4">{error}</p>}

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          {tab === "bookings" && <BookingsTable bookings={bookings} />}
          {tab === "rooms" && <RoomsEditor rooms={rooms} onSave={(data) => save("rooms", data)} />}
          {tab === "seasons" && <SeasonsEditor seasons={seasons} onSave={(data) => save("seasons", data)} />}
          {tab === "meal-plans" && <MealsEditor meals={meals} onSave={(data) => save("meal-plans", data)} />}
        </div>
      </div>
    </main>
  );
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0D0C] text-white">
      <form onSubmit={async (e) => {
        e.preventDefault();
        const res = await fetch("/api/admin?resource=bookings", { headers: { Authorization: `Bearer ${pw}` } });
        if (res.ok) onLogin(pw);
        else setErr("Invalid password");
      }} className="w-full max-w-sm space-y-5 px-6">
        <h1 className="text-2xl font-light text-center" style={{ fontFamily: "var(--font-display)" }}>Admin login</h1>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-white/30" required />
        {err && <p className="text-sm text-rose-300 text-center">{err}</p>}
        <button type="submit" className="w-full rounded-full bg-white py-3 text-[11px] uppercase tracking-[0.4em] text-black" style={{ fontFamily: "var(--font-display)" }}>Login</button>
      </form>
    </main>
  );
}

function BookingsTable({ bookings }: { bookings: Booking[] }) {
  if (!bookings.length) return <p className="text-sm text-white/50 text-center py-8">No bookings yet</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.3em] text-white/40">
            <th className="pb-3 pr-4 font-normal">Ref</th>
            <th className="pb-3 pr-4 font-normal">Guest</th>
            <th className="pb-3 pr-4 font-normal">Room</th>
            <th className="pb-3 pr-4 font-normal">Dates</th>
            <th className="pb-3 pr-4 font-normal">Guests</th>
            <th className="pb-3 pr-4 font-normal">Amount</th>
            <th className="pb-3 font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} className="border-b border-white/5 text-white/80">
              <td className="py-3 pr-4 text-[10px] uppercase tracking-[0.15em] text-white/50">{b.booking_ref}</td>
              <td className="py-3 pr-4">
                <div>{b.guest_name}</div>
                <div className="text-[10px] text-white/40">{b.phone} {b.email && `• ${b.email}`}</div>
              </td>
              <td className="py-3 pr-4">{b.room_name} ×{b.units}</td>
              <td className="py-3 pr-4 text-xs">{b.check_in} → {b.check_out}</td>
              <td className="py-3 pr-4 text-xs">{b.adults}A {b.children > 0 ? `${b.children}C` : ""}</td>
              <td className="py-3 pr-4">₹{b.amount.toLocaleString()}</td>
              <td className="py-3">
                <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.15em] ${
                  b.status === "confirmed" ? "bg-emerald-300/15 text-emerald-300" :
                  b.status === "cancelled" ? "bg-rose-300/15 text-rose-300" :
                  "bg-amber-300/15 text-amber-300"
                }`}>{b.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoomsEditor({ rooms, onSave }: { rooms: Room[]; onSave: (data: Room[]) => void }) {
  const [data, setData] = useState<Room[]>([]);
  useEffect(() => { setData(rooms.map((r) => ({ ...r }))); }, [rooms]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>Room inventory</h2>
        <button onClick={() => onSave(data)} className="rounded-full bg-white px-6 py-2 text-[10px] uppercase tracking-[0.3em] text-black" style={{ fontFamily: "var(--font-display)" }}>Save</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.3em] text-white/40">
              <th className="pb-3 pr-4 font-normal">Name</th>
              <th className="pb-3 pr-4 font-normal">Units</th>
              <th className="pb-3 pr-4 font-normal">Base price</th>
              <th className="pb-3 pr-4 font-normal">Max adults</th>
              <th className="pb-3 pr-4 font-normal">Max children</th>
              <th className="pb-3 font-normal">Child policy</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="py-2 pr-4"><input value={r.name} onChange={(e) => { const d = [...data]; d[i] = { ...d[i], name: e.target.value }; setData(d); }} className="w-32 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none" /></td>
                <td className="py-2 pr-4"><input type="number" value={r.units} onChange={(e) => { const d = [...data]; d[i] = { ...d[i], units: parseInt(e.target.value) || 0 }; setData(d); }} className="w-16 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none" /></td>
                <td className="py-2 pr-4"><input type="number" value={r.base_price} onChange={(e) => { const d = [...data]; d[i] = { ...d[i], base_price: parseInt(e.target.value) || 0 }; setData(d); }} className="w-24 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none" /></td>
                <td className="py-2 pr-4"><input type="number" value={r.max_adults} onChange={(e) => { const d = [...data]; d[i] = { ...d[i], max_adults: parseInt(e.target.value) || 1 }; setData(d); }} className="w-16 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none" /></td>
                <td className="py-2 pr-4"><input type="number" value={r.max_children} onChange={(e) => { const d = [...data]; d[i] = { ...d[i], max_children: parseInt(e.target.value) || 0 }; setData(d); }} className="w-16 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none" /></td>
                <td className="py-2"><input value={r.child_policy} onChange={(e) => { const d = [...data]; d[i] = { ...d[i], child_policy: e.target.value }; setData(d); }} className="w-48 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SeasonsEditor({ seasons, onSave }: { seasons: Season[]; onSave: (data: Season[]) => void }) {
  const [data, setData] = useState<Season[]>([]);
  useEffect(() => { setData(seasons.map((s) => ({ ...s }))); }, [seasons]);

  const add = () => setData([...data, { start_date: "", end_date: "", multiplier: 1 }]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>Seasons</h2>
        <div className="flex gap-3">
          <button onClick={add} className="rounded-full border border-white/20 px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-white/60 hover:text-white">+ Add</button>
          <button onClick={() => onSave(data)} className="rounded-full bg-white px-6 py-2 text-[10px] uppercase tracking-[0.3em] text-black" style={{ fontFamily: "var(--font-display)" }}>Save</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.3em] text-white/40">
              <th className="pb-3 pr-4 font-normal">Start</th>
              <th className="pb-3 pr-4 font-normal">End</th>
              <th className="pb-3 font-normal">Multiplier</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-2 pr-4"><input type="date" value={s.start_date} onChange={(e) => { const d = [...data]; d[i] = { ...d[i], start_date: e.target.value }; setData(d); }} className="w-36 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none" /></td>
                <td className="py-2 pr-4"><input type="date" value={s.end_date} onChange={(e) => { const d = [...data]; d[i] = { ...d[i], end_date: e.target.value }; setData(d); }} className="w-36 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none" /></td>
                <td className="py-2"><input type="number" step="0.1" value={s.multiplier} onChange={(e) => { const d = [...data]; d[i] = { ...d[i], multiplier: parseFloat(e.target.value) || 1 }; setData(d); }} className="w-20 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MealsEditor({ meals, onSave }: { meals: MealPlan[]; onSave: (data: MealPlan[]) => void }) {
  const [data, setData] = useState<MealPlan[]>([]);
  useEffect(() => { setData(meals.map((m) => ({ ...m }))); }, [meals]);

  const add = () => setData([...data, { code: "", name: "", price: 0 }]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>Meal plans</h2>
        <div className="flex gap-3">
          <button onClick={add} className="rounded-full border border-white/20 px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-white/60 hover:text-white">+ Add</button>
          <button onClick={() => onSave(data)} className="rounded-full bg-white px-6 py-2 text-[10px] uppercase tracking-[0.3em] text-black" style={{ fontFamily: "var(--font-display)" }}>Save</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.3em] text-white/40">
              <th className="pb-3 pr-4 font-normal">Code</th>
              <th className="pb-3 pr-4 font-normal">Name</th>
              <th className="pb-3 font-normal">Price/night</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-2 pr-4"><input value={m.code} onChange={(e) => { const d = [...data]; d[i] = { ...d[i], code: e.target.value }; setData(d); }} className="w-16 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none" /></td>
                <td className="py-2 pr-4"><input value={m.name} onChange={(e) => { const d = [...data]; d[i] = { ...d[i], name: e.target.value }; setData(d); }} className="w-64 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none" /></td>
                <td className="py-2"><input type="number" value={m.price} onChange={(e) => { const d = [...data]; d[i] = { ...d[i], price: parseInt(e.target.value) || 0 }; setData(d); }} className="w-24 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
