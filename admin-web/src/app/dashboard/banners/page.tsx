"use client";

import { useEffect, useState } from "react";
import { api, uploadBannerImage } from "@/lib/api";

const MAX_BANNERS = 3;

type Banner = { id: string; imageUrl: string; title: string; sortOrder: number };

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const { banners: data } = await api.banners.list();
      setBanners(data.length ? data : [{ id: "", imageUrl: "", title: "", sortOrder: 0 }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(index: number, file: File) {
    try {
      setUploading(index);
      const url = await uploadBannerImage(file);
      const next = [...banners];
      if (!next[index]) next[index] = { id: `b${Date.now()}`, imageUrl: "", title: "", sortOrder: index };
      next[index] = { ...next[index], imageUrl: url };
      setBanners(next);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function handleSave() {
    const list = banners
      .filter((b) => b.imageUrl?.trim())
      .slice(0, MAX_BANNERS)
      .map((b, i) => ({ ...b, sortOrder: i }));
    try {
      setSaving(true);
      setError(null);
      await api.banners.save(list);
      setBanners(list.length ? list : [{ id: "", imageUrl: "", title: "", sortOrder: 0 }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function addSlot() {
    if (banners.length >= MAX_BANNERS) return;
    setBanners([...banners, { id: `b${Date.now()}`, imageUrl: "", title: "", sortOrder: banners.length }]);
  }

  function removeSlot(index: number) {
    setBanners(banners.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-[#64748B]">Loading banners...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-[#1E293B]">Parent App Banners</h1>
        <p className="text-[#64748B] mt-1">
          Set up to {MAX_BANNERS} carousel banners for events, achievements, and announcements. Shown on the Parents app dashboard.
        </p>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-6">
          {banners.map((b, i) => (
            <div
              key={b.id || i}
              className="p-6 bg-white border border-[#E2E8F0] rounded-xl shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#64748B] mb-1">Title (e.g. Event, Achievement)</label>
                    <input
                      type="text"
                      value={b.title}
                      onChange={(e) => {
                        const next = [...banners];
                        next[i] = { ...next[i], title: e.target.value };
                        setBanners(next);
                      }}
                      placeholder="Annual Day 2024"
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#64748B] mb-1">Banner Image</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`banner-file-${i}`}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(i, f);
                          e.target.value = "";
                        }}
                      />
                      <label
                        htmlFor={`banner-file-${i}`}
                        className="px-4 py-2 bg-[#0F766E] text-white rounded-lg cursor-pointer hover:bg-[#0D9488] disabled:opacity-50"
                      >
                        {uploading === i ? "Uploading…" : b.imageUrl ? "Change Image" : "Upload Image"}
                      </label>
                      {b.imageUrl && (
                        <div className="flex items-center gap-2">
                          <img
                            src={b.imageUrl}
                            alt=""
                            className="w-24 h-14 object-cover rounded-lg border border-[#E2E8F0]"
                          />
                          <button
                            type="button"
                            onClick={() => removeSlot(i)}
                            className="text-red-600 text-sm hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {banners.length < MAX_BANNERS && (
            <button
              type="button"
              onClick={addSlot}
              className="w-full py-4 border-2 border-dashed border-[#E2E8F0] rounded-xl text-[#64748B] hover:border-[#0F766E] hover:text-[#0F766E]"
            >
              + Add Banner ({banners.length}/{MAX_BANNERS})
            </button>
          )}
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#0F766E] text-white rounded-lg font-medium hover:bg-[#0D9488] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Banners"}
          </button>
          <button
            onClick={load}
            className="px-6 py-2.5 border border-[#E2E8F0] text-[#64748B] rounded-lg font-medium hover:bg-[#F8FAFC]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
