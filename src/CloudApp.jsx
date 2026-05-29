import { useEffect, useMemo, useState } from "react";
import {
  cloudbaseApp,
  cloudbaseDb,
  cloudbaseEnabled,
  cloudbaseFamilyId,
  normalizeCloudDoc,
  uploadCloudBasePhoto,
} from "./lib/cloudbase";

const collections = {
  members: "family_members",
  relations: "family_relations",
  events: "family_events",
  photos: "family_photos",
};

const tabs = [
  ["tree", "关系图谱"],
  ["photos", "照片墙"],
  ["timeline", "大事记"],
];

function emptyMember() {
  return { name: "", birth: "", role: "", bio: "" };
}

function emptyEvent() {
  return { title: "", date: "", detail: "" };
}

function emptyPhoto() {
  return { title: "", meta: "", description: "" };
}

export default function CloudApp() {
  const [activeTab, setActiveTab] = useState("tree");
  const [members, setMembers] = useCloudCollection(collections.members);
  const [relations, setRelations] = useCloudCollection(collections.relations);
  const [events, setEvents] = useCloudCollection(collections.events);
  const [photos, setPhotos] = useCloudCollection(collections.photos);
  const graph = useMemo(() => buildGraph(members, relations), [members, relations]);

  if (!cloudbaseEnabled) {
    return (
      <main className="min-h-screen bg-porcelain p-4">
        <Panel title="CloudBase 未配置">
          <p className="leading-7 text-ink/70">
            请在部署环境中设置 VITE_BACKEND_PROVIDER=cloudbase 和 VITE_CLOUDBASE_ENV_ID。
          </p>
        </Panel>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-porcelain text-ink">
      <section className="border-b border-black/10 bg-[linear-gradient(135deg,#f8f5ef_0%,#f4e2b8_46%,#dbe8df_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rosewood">Leiyuan Village</p>
          <h1 className="mt-3 text-4xl font-bold text-ink">雷园村家族记忆</h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-ink/75">
            国内访问版已接入腾讯云 CloudBase，成员、照片和大事记会同步到国内云端。
          </p>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`min-h-11 shrink-0 rounded-full px-5 text-sm font-bold ${
                  activeTab === id ? "bg-ink text-white" : "bg-white/75 text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <LocationSection />
        {activeTab === "tree" && (
          <CloudTree
            members={members}
            relations={relations}
            graph={graph}
            setMembers={setMembers}
            setRelations={setRelations}
          />
        )}
        {activeTab === "photos" && <CloudPhotos photos={photos} setPhotos={setPhotos} />}
        {activeTab === "timeline" && <CloudTimeline events={events} setEvents={setEvents} />}
      </section>
    </main>
  );
}

function useCloudCollection(collectionName) {
  const [items, setItems] = useState([]);
  const collectionRef = useMemo(() => cloudbaseDb?.collection(collectionName), [collectionName]);

  useEffect(() => {
    if (!collectionRef) return undefined;

    const listener = collectionRef.where({ familyId: cloudbaseFamilyId }).watch({
      onChange: (snapshot) => {
        setItems((snapshot.docs || []).map(normalizeCloudDoc));
      },
      onError: (error) => {
        console.error(`${collectionName} watch error`, error);
      },
    });

    return () => listener?.close?.();
  }, [collectionRef, collectionName]);

  async function add(item) {
    await collectionRef.add({
      ...item,
      familyId: cloudbaseFamilyId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  async function update(id, item) {
    await collectionRef.doc(id).update({
      ...item,
      updatedAt: Date.now(),
    });
  }

  async function remove(id) {
    await collectionRef.doc(id).remove();
  }

  return [items, { add, update, remove }];
}

function CloudTree({ members, relations, graph, setMembers, setRelations }) {
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [editingId, setEditingId] = useState("");
  const [relationForm, setRelationForm] = useState({ from: "", to: "", type: "父母" });

  const memberName = (id) => members.find((member) => member.id === id)?.name || "未知成员";

  async function saveMember(event) {
    event.preventDefault();
    if (!memberForm.name.trim()) return;

    if (editingId) {
      await setMembers.update(editingId, memberForm);
    } else {
      await setMembers.add(memberForm);
    }

    setMemberForm(emptyMember());
    setEditingId("");
  }

  async function deleteMember(member) {
    if (!window.confirm(`确定要删除 ${member.name} 吗？相关关系也会一起删除。`)) return;
    await setMembers.remove(member.id);
    await Promise.all(
      relations
        .filter((relation) => relation.from === member.id || relation.to === member.id)
        .map((relation) => setRelations.remove(relation.id))
    );
  }

  async function addRelation(event) {
    event.preventDefault();
    if (!relationForm.from || !relationForm.to || relationForm.from === relationForm.to) return;
    await setRelations.add(relationForm);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[390px_1fr]">
      <div className="space-y-5">
        <Panel title={editingId ? "编辑成员" : "新增成员"}>
          <form onSubmit={saveMember} className="space-y-3">
            <Input label="姓名" value={memberForm.name} onChange={(name) => setMemberForm({ ...memberForm, name })} required />
            <Input label="生辰" type="date" value={memberForm.birth} onChange={(birth) => setMemberForm({ ...memberForm, birth })} />
            <Input label="身份 / 昵称" value={memberForm.role} onChange={(role) => setMemberForm({ ...memberForm, role })} />
            <Textarea label="简介" value={memberForm.bio} onChange={(bio) => setMemberForm({ ...memberForm, bio })} />
            <button className="min-h-12 w-full rounded-lg bg-lagoon px-4 py-3 text-base font-bold text-white">
              保存成员
            </button>
          </form>
        </Panel>

        <Panel title="定义关系">
          <form onSubmit={addRelation} className="space-y-3">
            <Select label="成员 A" value={relationForm.from} onChange={(from) => setRelationForm({ ...relationForm, from })} options={members} />
            <Select
              label="关系"
              value={relationForm.type}
              onChange={(type) => setRelationForm({ ...relationForm, type })}
              options={["父母", "配偶", "子女", "兄弟姐妹", "其他亲属"].map((name) => ({ id: name, name }))}
            />
            <Select label="成员 B" value={relationForm.to} onChange={(to) => setRelationForm({ ...relationForm, to })} options={members} />
            <button className="min-h-12 w-full rounded-lg bg-moss px-4 py-3 text-base font-bold text-white">
              添加关系
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {relations.map((relation) => (
              <div key={relation.id} className="flex items-center justify-between gap-3 rounded-md bg-black/[0.035] px-3 py-2 text-sm">
                <span>{memberName(relation.from)} · {relation.type} · {memberName(relation.to)}</span>
                <button
                  onClick={() => {
                    if (window.confirm("确定要删除这条家族关系吗？")) setRelations.remove(relation.id);
                  }}
                  className="min-h-10 px-2 font-bold text-rosewood"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel title="关系图谱">
          <Graph graph={graph} />
        </Panel>
        <Panel title="成员名录">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => (
              <article key={member.id} className="rounded-lg border border-black/10 bg-white p-4">
                <h3 className="text-lg font-bold">{member.name}</h3>
                <p className="mt-1 text-sm font-semibold text-moss">{member.role || "家族成员"}</p>
                <p className="mt-3 text-sm leading-6 text-ink/75">{member.bio || "还没有简介。"}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      setMemberForm({ name: member.name || "", birth: member.birth || "", role: member.role || "", bio: member.bio || "" });
                      setEditingId(member.id);
                    }}
                    className="min-h-10 rounded-md bg-lagoon/10 px-3 text-sm font-bold text-lagoon"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => deleteMember(member)}
                    className="min-h-10 rounded-md bg-red-50 px-3 text-sm font-bold text-rosewood"
                  >
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function CloudPhotos({ photos, setPhotos }) {
  const [form, setForm] = useState(emptyPhoto);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function uploadPhoto(event) {
    event.preventDefault();
    if (!file || !form.title.trim()) return;
    setBusy(true);
    setError("");

    try {
      const uploaded = await uploadCloudBasePhoto(file, setProgress);
      await setPhotos.add({ ...form, ...uploaded });
      setForm(emptyPhoto());
      setFile(null);
      event.currentTarget.reset();
    } catch (uploadError) {
      setError(uploadError.message || "上传失败，请检查 CloudBase 存储配置。");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  async function deletePhoto(photo) {
    if (!window.confirm("确定要删除这张家族照片吗？")) return;

    if (photo.fileID) {
      await cloudbaseApp.deleteFile({ fileList: [photo.fileID] }).catch(() => undefined);
    }
    await setPhotos.remove(photo.id);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[390px_1fr]">
      <Panel title="上传照片">
        <form onSubmit={uploadPhoto} className="space-y-3">
          <Input label="照片标题" value={form.title} onChange={(title) => setForm({ ...form, title })} required />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink/75">选择图片</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="block min-h-12 w-full rounded-lg border border-black/10 bg-white px-3 py-3 text-base"
              required
            />
          </label>
          <Input label="时间 / 地点 / 人物" value={form.meta} onChange={(meta) => setForm({ ...form, meta })} />
          <Textarea label="描述" value={form.description} onChange={(description) => setForm({ ...form, description })} />
          {busy && <div className="rounded-md bg-black/5 p-2 text-sm text-ink/70">上传中 {progress}%</div>}
          {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          <button disabled={busy} className="min-h-12 w-full rounded-lg bg-lagoon px-4 py-3 text-base font-bold text-white disabled:bg-black/20">
            上传到国内云端
          </button>
        </form>
      </Panel>

      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {photos.map((photo) => (
          <article key={photo.id} className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
            <img src={photo.downloadURL} alt={photo.title} className="aspect-[4/3] w-full object-cover" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold">{photo.title}</h3>
                <button onClick={() => deletePhoto(photo)} className="min-h-10 rounded-md bg-red-50 px-3 text-sm font-bold text-rosewood">
                  删除
                </button>
              </div>
              <p className="mt-2 text-sm font-medium text-moss">{photo.meta || "未填写附加信息"}</p>
              <p className="mt-3 text-sm leading-6 text-ink/75">{photo.description || "还没有描述。"}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CloudTimeline({ events, setEvents }) {
  const [form, setForm] = useState(emptyEvent);
  const sortedEvents = useMemo(() => [...events].sort((a, b) => (a.date || "").localeCompare(b.date || "")), [events]);

  async function addEvent(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.date) return;
    await setEvents.add(form);
    setForm(emptyEvent());
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[390px_1fr]">
      <Panel title="记录大事">
        <form onSubmit={addEvent} className="space-y-3">
          <Input label="事件标题" value={form.title} onChange={(title) => setForm({ ...form, title })} required />
          <Input label="日期" type="date" value={form.date} onChange={(date) => setForm({ ...form, date })} required />
          <Textarea label="详情" value={form.detail} onChange={(detail) => setForm({ ...form, detail })} />
          <button className="min-h-12 w-full rounded-lg bg-moss px-4 py-3 text-base font-bold text-white">
            添加到时间轴
          </button>
        </form>
      </Panel>

      <Panel title="家族时间轴">
        <div className="relative space-y-5 pl-5 before:absolute before:left-1 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-moss/35">
          {sortedEvents.map((item) => (
            <article key={item.id} className="relative rounded-lg border border-black/10 bg-white p-4 shadow-sm before:absolute before:-left-[22px] before:top-5 before:h-3 before:w-3 before:rounded-full before:bg-rosewood">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-moss">{item.date || "未填写日期"}</p>
                  <h3 className="mt-1 text-lg font-bold">{item.title}</h3>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm("确定要删除这条家族记忆吗？")) setEvents.remove(item.id);
                  }}
                  className="min-h-10 rounded-md bg-red-50 px-3 text-sm font-bold text-rosewood"
                >
                  删除
                </button>
              </div>
              <p className="mt-3 leading-7 text-ink/75">{item.detail || "还没有详情。"}</p>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

const locationSlides = [
  { id: "map", title: "雷园村地图定位", caption: "江西省抚州市崇仁县雷园村", image: "/location-map.svg" },
  { id: "gate", title: "雷园村村口", caption: "雷园村入口与村景", image: "/leiyuan-village.svg" },
];

function LocationSection() {
  const [activeSlide, setActiveSlide] = useState(0);
  const current = locationSlides[activeSlide];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((index) => (index + 1) % locationSlides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="mb-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Panel title="家族根脉所在地">
        <p className="text-base leading-8 text-ink/75">
          <span className="font-semibold text-ink">位置：</span>
          江西省抚州市崇仁县雷园村
        </p>
        <a
          href="https://map.baidu.com/search/%E6%B1%9F%E8%A5%BF%E7%9C%81%E6%8A%9A%E5%B7%9E%E5%B8%82%E5%B4%87%E4%BB%81%E5%8E%BF%E9%9B%B7%E5%9B%AD%E6%9D%91"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          打开地图导航
        </a>
      </Panel>
      <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="relative aspect-[4/3] w-full sm:aspect-[16/9]">
          <img src={current.image} alt={current.title} className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 text-white">
            <p className="text-lg font-bold">{current.title}</p>
            <p className="mt-1 text-sm text-white/85">{current.caption}</p>
          </div>
          <button
            onClick={() => setActiveSlide((activeSlide - 1 + locationSlides.length) % locationSlides.length)}
            className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl font-bold text-ink"
          >
            ‹
          </button>
          <button
            onClick={() => setActiveSlide((activeSlide + 1) % locationSlides.length)}
            className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl font-bold text-ink"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}

function buildGraph(members, relations) {
  const width = 820;
  const height = 460;
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = Math.min(300, 130 + members.length * 28);
  const radiusY = Math.min(165, 90 + members.length * 16);
  const nodes = members.map((member, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(members.length, 1) - Math.PI / 2;
    return {
      ...member,
      x: members.length === 1 ? centerX : centerX + Math.cos(angle) * radiusX,
      y: members.length === 1 ? centerY : centerY + Math.sin(angle) * radiusY,
    };
  });
  const lookup = new Map(nodes.map((node) => [node.id, node]));
  const edges = relations
    .map((relation) => ({ ...relation, fromNode: lookup.get(relation.from), toNode: lookup.get(relation.to) }))
    .filter((edge) => edge.fromNode && edge.toNode);
  return { nodes, edges, width, height };
}

function Graph({ graph }) {
  if (!graph.nodes.length) return <p className="rounded-lg bg-black/[0.035] p-5 text-ink/60">先添加家族成员。</p>;

  return (
    <div className="overflow-auto rounded-lg bg-[#fdfbf6]">
      <svg viewBox={`0 0 ${graph.width} ${graph.height}`} className="h-[390px] min-w-[720px] sm:h-[460px] sm:min-w-full">
        {graph.edges.map((edge) => (
          <g key={edge.id}>
            <line
              x1={edge.fromNode.x}
              y1={edge.fromNode.y}
              x2={edge.toNode.x}
              y2={edge.toNode.y}
              stroke={edge.type === "配偶" ? "#a65d57" : "#8f6b4a"}
              strokeWidth="2.5"
              strokeDasharray={edge.type === "配偶" ? "0" : "8 7"}
            />
            <text x={(edge.fromNode.x + edge.toNode.x) / 2} y={(edge.fromNode.y + edge.toNode.y) / 2 - 8} textAnchor="middle" className="fill-ink text-[12px] font-semibold">
              {edge.type}
            </text>
          </g>
        ))}
        {graph.nodes.map((node) => (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r="48" fill="#ffffff" stroke="#5f7f64" strokeWidth="3" />
            <circle cx={node.x} cy={node.y - 18} r="14" fill="#f4e2b8" />
            <text x={node.x} y={node.y + 8} textAnchor="middle" className="fill-ink text-[15px] font-bold">
              {node.name}
            </text>
            <text x={node.x} y={node.y + 28} textAnchor="middle" className="fill-[#5f7f64] text-[12px] font-semibold">
              {node.role || "成员"}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-sm backdrop-blur">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Input({ label, value, onChange, type = "text", required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink/75">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-lg border border-black/10 bg-white px-3 py-3 text-base outline-none transition focus:border-lagoon focus:ring-4 focus:ring-lagoon/10"
      />
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink/75">{label}</span>
      <textarea
        value={value}
        rows="4"
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-3 text-base leading-7 outline-none transition focus:border-lagoon focus:ring-4 focus:ring-lagoon/10"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink/75">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-lg border border-black/10 bg-white px-3 py-3 text-base outline-none transition focus:border-lagoon focus:ring-4 focus:ring-lagoon/10"
      >
        <option value="">请选择</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
