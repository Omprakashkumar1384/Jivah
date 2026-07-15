'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type InventoryItem = {
  id: string;
  medicine_name: string;
  price: string;
  stock_qty: number;
};

type Order = {
  id: string;
  status: string;
  total_amount: string | null;
  delivery_address: string | null;
  created_at: string;
  patient_name: string;
  patient_phone: string;
};

const orderStatusColors: Record<string, string> = {
  placed: '#c88a1e',
  confirmed: '#1f7a54',
  out_for_delivery: '#1f7a54',
  delivered: '#6b615d',
  cancelled: '#c81e3a',
};

export default function StorePortalPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ medicine_name: '', price: '', stock_qty: '' });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [inv, ord] = await Promise.all([
        apiFetch('/store/inventory'),
        apiFetch('/store/orders'),
      ]);
      setInventory(inv);
      setOrders(ord);
    } catch (err: any) {
      setError(err.message || 'Failed to load store data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/store/inventory', {
        method: 'POST',
        body: JSON.stringify({
          medicine_name: form.medicine_name,
          price: parseFloat(form.price),
          stock_qty: parseInt(form.stock_qty, 10),
        }),
      });
      setForm({ medicine_name: '', price: '', stock_qty: '' });
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-[var(--ink-muted)]">Loading…</p>;

  return (
    <div className="space-y-10">
      {error && (
        <p className="text-sm text-[var(--red)] bg-[var(--red-tint)] px-3 py-2 rounded">
          {error}
        </p>
      )}

      {/* Inventory */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-xl">Inventory</h2>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="text-sm px-4 py-2 rounded-md text-white"
            style={{ background: 'var(--red)' }}
          >
            {showForm ? 'Cancel' : '+ Add Item'}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleAddItem}
            className="bg-white rounded-lg border border-[var(--line)] p-6 mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
          >
            <div>
              <label className="text-xs text-[var(--ink-muted)]">Medicine name</label>
              <input
                className="input-underline w-full"
                value={form.medicine_name}
                onChange={(e) => setForm({ ...form, medicine_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs text-[var(--ink-muted)]">Price (₹)</label>
              <input
                className="input-underline w-full"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs text-[var(--ink-muted)]">Stock qty</label>
              <input
                className="input-underline w-full"
                type="number"
                value={form.stock_qty}
                onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="py-2.5 rounded-md text-white text-sm disabled:opacity-60"
              style={{ background: 'var(--red-deep)' }}
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}

        {inventory.length === 0 ? (
          <div className="bg-white rounded-lg border border-[var(--line)] p-8 text-center">
            <p className="text-[var(--ink-muted)]">No medicines in stock yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[var(--line)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[var(--ink-muted)]">
                  <th className="px-6 py-3 font-normal">Medicine</th>
                  <th className="px-6 py-3 font-normal">Price</th>
                  <th className="px-6 py-3 font-normal">Stock</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-6 py-3">{item.medicine_name}</td>
                    <td className="px-6 py-3 font-mono-data">₹{item.price}</td>
                    <td className="px-6 py-3 font-mono-data">{item.stock_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Orders */}
      <section>
        <h2 className="font-display text-xl mb-4">Orders</h2>
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg border border-[var(--line)] p-8 text-center">
            <p className="text-[var(--ink-muted)]">No orders yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[var(--line)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[var(--ink-muted)]">
                  <th className="px-6 py-3 font-normal">Patient</th>
                  <th className="px-6 py-3 font-normal">Phone</th>
                  <th className="px-6 py-3 font-normal">Status</th>
                  <th className="px-6 py-3 font-normal">Total</th>
                  <th className="px-6 py-3 font-normal">Placed On</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-6 py-3">{order.patient_name}</td>
                    <td className="px-6 py-3 font-mono-data">{order.patient_phone}</td>
                    <td className="px-6 py-3">
                      <span
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          color: orderStatusColors[order.status] || 'var(--ink)',
                          background: 'var(--bg-subtle)',
                        }}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-mono-data">
                      {order.total_amount ? `₹${order.total_amount}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-[var(--ink-muted)]">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
