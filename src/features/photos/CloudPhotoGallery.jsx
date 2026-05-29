import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "../../lib/firebase";

const FAMILY_ID = "default-family";

export default function CloudPhotoGallery() {
  const [photos, setPhotos] = useState([]);
  const [form, setForm] = useState({ title: "", meta: "", description: "" });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const photosQuery = query(
      collection(db, "families", FAMILY_ID, "photos"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(photosQuery, (snapshot) => {
      setPhotos(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });
  }, []);

  async function uploadPhoto(event) {
    event.preventDefault();
    if (!file || !form.title.trim()) return;

    setBusy(true);
    setError("");
    setProgress(0);

    try {
      const safeName = file.name.replace(/[^\w.-]/g, "_");
      const imagePath = `families/${FAMILY_ID}/photos/${Date.now()}-${safeName}`;
      const imageRef = ref(storage, imagePath);
      const task = uploadBytesResumable(imageRef, file, {
        contentType: file.type,
      });

      await new Promise((resolve, reject) => {
        task.on(
          "state_changed",
          (snapshot) => {
            const nextProgress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setProgress(nextProgress);
          },
          reject,
          resolve
        );
      });

      const downloadURL = await getDownloadURL(imageRef);

      await addDoc(collection(db, "families", FAMILY_ID, "photos"), {
        title: form.title.trim(),
        meta: form.meta.trim(),
        description: form.description.trim(),
        imagePath,
        downloadURL,
        createdAt: serverTimestamp(),
      });

      setForm({ title: "", meta: "", description: "" });
      setFile(null);
      event.currentTarget.reset();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setBusy(false);
    }
  }

  async function deletePhoto(photo) {
    if (!window.confirm("确定要删除这张家族照片吗？")) return;

    try {
      if (photo.imagePath) {
        await deleteObject(ref(storage, photo.imagePath));
      }
      await deleteDoc(doc(db, "families", FAMILY_ID, "photos", photo.id));
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  return (
    <section className="space-y-4">
      <form onSubmit={uploadPhoto} className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">上传家族合照</h2>
        <div className="mt-4 space-y-3">
          <MobileInput
            label="照片标题"
            value={form.title}
            onChange={(title) => setForm({ ...form, title })}
            placeholder="如：2026 春节团圆饭"
            required
          />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">选择图片</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="block min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700"
              required
            />
          </label>
          <MobileInput
            label="时间 / 地点 / 人物"
            value={form.meta}
            onChange={(meta) => setForm({ ...form, meta })}
            placeholder="2026-02-16 · 老家 · 全家"
          />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">描述</span>
            <textarea
              rows="4"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-3 text-base leading-7 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
          {busy && (
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          <button
            disabled={busy}
            className="min-h-12 w-full rounded-lg bg-emerald-700 px-4 py-3 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy ? `上传中 ${progress}%` : "上传到云端照片库"}
          </button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => (
          <article key={photo.id} className="overflow-hidden rounded-lg bg-white shadow-sm">
            <img src={photo.downloadURL} alt={photo.title} className="aspect-[4/3] w-full object-cover" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-slate-900">{photo.title}</h3>
                <button
                  onClick={() => deletePhoto(photo)}
                  className="min-h-10 rounded-lg bg-red-50 px-3 text-sm font-bold text-red-700"
                >
                  删除
                </button>
              </div>
              <p className="mt-1 text-sm font-semibold text-emerald-700">{photo.meta || "未填写时间地点"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{photo.description || "还没有描述。"}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MobileInput({ label, value, onChange, placeholder = "", required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-lg border border-slate-200 px-3 py-3 text-base outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}
