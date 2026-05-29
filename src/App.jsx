import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "family-memory-graph-v1";

const initialData = {
  members: [
    {
      id: crypto.randomUUID(),
      name: "李明远",
      birth: "1958-04-12",
      role: "爷爷",
      bio: "喜欢写家谱、修旧照片，是家里故事的收藏家。",
    },
    {
      id: crypto.randomUUID(),
      name: "周兰",
      birth: "1961-09-03",
      role: "奶奶",
      bio: "做得一手好菜，每年春节都负责总导演。",
    },
    {
      id: crypto.randomUUID(),
      name: "李晴",
      birth: "1987-06-21",
      role: "女儿",
      bio: "热爱旅行，经常组织家庭相册整理日。",
    },
  ],
  relations: [],
  photos: [
    {
      id: crypto.randomUUID(),
      url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80",
      title: "春节团圆饭",
      meta: "2026 · 老家客厅 · 全家",
      description: "每年最热闹的一顿饭，长辈坐中间，小朋友负责贴春联。",
    },
  ],
  events: [
    {
      id: crypto.randomUUID(),
      title: "第一次家庭影像整理日",
      date: "2026-02-16",
      detail: "把老照片按年份扫描归档，并记录每张照片背后的故事。",
    },
  ],
};

const locationSlides = [
  {
    id: "map",
    title: "雷园村地图定位",
    caption: "江西省抚州市崇仁县雷园村",
    image: "/location-map.svg",
  },
  {
    id: "gate",
    title: "雷园村村口",
    caption: "雷园村入口与村景",
    image: "/leiyuan-village.svg",
  },
];

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialData;
    const parsed = JSON.parse(saved);
    return {
      members: parsed.members || [],
      relations: parsed.relations || [],
      photos: parsed.photos || [],
      events: parsed.events || [],
    };
  } catch {
    return initialData;
  }
}

function emptyMember() {
  return { name: "", birth: "", role: "", bio: "" };
}

function emptyPhoto() {
  return { title: "", url: "", meta: "", description: "" };
}

function emptyEvent() {
  return { title: "", date: "", detail: "" };
}

function formatDate(value) {
  if (!value) return "日期未填";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function App() {
  const [data, setData] = useState(loadData);
  const [activeTab, setActiveTab] = useState("tree");
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [relationForm, setRelationForm] = useState({ from: "", to: "", type: "父母" });
  const [photoForm, setPhotoForm] = useState(emptyPhoto);
  const [eventForm, setEventForm] = useState(emptyEvent);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const memberName = (id) => data.members.find((m) => m.id === id)?.name || "未知成员";

  const sortedEvents = useMemo(
    () => [...data.events].sort((a, b) => (a.date || "").localeCompare(b.date || "")),
    [data.events]
  );

  const graph = useMemo(() => buildGraph(data.members, data.relations), [data.members, data.relations]);

  function saveMember(event) {
    event.preventDefault();
    const clean = {
      name: memberForm.name.trim(),
      birth: memberForm.birth,
      role: memberForm.role.trim(),
      bio: memberForm.bio.trim(),
    };
    if (!clean.name) return;

    if (editingMemberId) {
      setData((current) => ({
        ...current,
        members: current.members.map((member) =>
          member.id === editingMemberId ? { ...member, ...clean } : member
        ),
      }));
    } else {
      setData((current) => ({
        ...current,
        members: [{ id: crypto.randomUUID(), ...clean }, ...current.members],
      }));
    }
    setMemberForm(emptyMember());
    setEditingMemberId(null);
  }

  function editMember(member) {
    setMemberForm({ name: member.name, birth: member.birth, role: member.role, bio: member.bio });
    setEditingMemberId(member.id);
  }

  function deleteMember(id) {
    if (!window.confirm("确定要删除这位家族成员吗？相关关系也会一起移除。")) return;
    setData((current) => ({
      ...current,
      members: current.members.filter((member) => member.id !== id),
      relations: current.relations.filter((relation) => relation.from !== id && relation.to !== id),
    }));
    if (editingMemberId === id) {
      setMemberForm(emptyMember());
      setEditingMemberId(null);
    }
  }

  function addRelation(event) {
    event.preventDefault();
    if (!relationForm.from || !relationForm.to || relationForm.from === relationForm.to) return;
    setData((current) => ({
      ...current,
      relations: [
        ...current.relations,
        { id: crypto.randomUUID(), ...relationForm },
      ],
    }));
  }

  function deleteRelation(id) {
    if (!window.confirm("确定要删除这条家族关系吗？")) return;
    setData((current) => ({
      ...current,
      relations: current.relations.filter((relation) => relation.id !== id),
    }));
  }

  function addPhoto(event) {
    event.preventDefault();
    if (!photoForm.title.trim() || !photoForm.url.trim()) return;
    setData((current) => ({
      ...current,
      photos: [{ id: crypto.randomUUID(), ...photoForm }, ...current.photos],
    }));
    setPhotoForm(emptyPhoto());
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoForm((current) => ({ ...current, url: reader.result }));
    reader.readAsDataURL(file);
  }

  function deletePhoto(id) {
    if (!window.confirm("确定要删除这张家族照片吗？")) return;
    setData((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo.id !== id),
    }));
  }

  function addEvent(event) {
    event.preventDefault();
    if (!eventForm.title.trim() || !eventForm.date) return;
    setData((current) => ({
      ...current,
      events: [{ id: crypto.randomUUID(), ...eventForm }, ...current.events],
    }));
    setEventForm(emptyEvent());
  }

  function deleteEvent(id) {
    if (!window.confirm("确定要删除这条家族记忆吗？")) return;
    setData((current) => ({
      ...current,
      events: current.events.filter((item) => item.id !== id),
    }));
  }

  function resetDemo() {
    setData(initialData);
    setMemberForm(emptyMember());
    setPhotoForm(emptyPhoto());
    setEventForm(emptyEvent());
    setEditingMemberId(null);
  }

  return (
    <main className="min-h-screen">
      <section className="border-b border-black/10 bg-[linear-gradient(135deg,#f8f5ef_0%,#f4e2b8_46%,#dbe8df_100%)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rosewood">Family Memory</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-normal text-ink sm:text-5xl">
              家族专属记忆与关系图谱
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-ink/75">
              用一个温暖、可编辑的空间保存家族成员、关系、照片与重要时刻。所有数据暂存在本机浏览器
              localStorage 中，适合作为后续接入 Firebase 或 Supabase 前的 MVP。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                ["tree", "关系图谱"],
                ["gallery", "照片墙"],
                ["timeline", "大事记"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    activeTab === id
                      ? "bg-ink text-white shadow-soft"
                      : "bg-white/70 text-ink hover:bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-lg bg-white/55 p-4 shadow-soft backdrop-blur">
            <Stat label="成员" value={data.members.length} />
            <Stat label="关系" value={data.relations.length} />
            <Stat label="照片" value={data.photos.length} />
            <Stat label="事件" value={data.events.length} />
            <button
              onClick={resetDemo}
              className="col-span-2 rounded-md bg-rosewood px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#924d49]"
            >
              恢复示例数据
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <LocationSection />

        {activeTab === "tree" && (
          <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
            <div className="space-y-5">
              <Panel title={editingMemberId ? "编辑成员" : "新增成员"}>
                <form onSubmit={saveMember} className="space-y-3">
                  <Input label="姓名" value={memberForm.name} onChange={(name) => setMemberForm({ ...memberForm, name })} required />
                  <Input label="生辰" type="date" value={memberForm.birth} onChange={(birth) => setMemberForm({ ...memberForm, birth })} />
                  <Input label="身份 / 昵称" value={memberForm.role} onChange={(role) => setMemberForm({ ...memberForm, role })} placeholder="如：爷爷、姐姐、外孙" />
                  <Textarea label="简介" value={memberForm.bio} onChange={(bio) => setMemberForm({ ...memberForm, bio })} />
                  <div className="flex gap-2">
                    <button className="rounded-md bg-lagoon px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#356f78]">
                      {editingMemberId ? "保存修改" : "添加成员"}
                    </button>
                    {editingMemberId && (
                      <button
                        type="button"
                        onClick={() => {
                          setMemberForm(emptyMember());
                          setEditingMemberId(null);
                        }}
                        className="rounded-md bg-black/5 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-black/10"
                      >
                        取消
                      </button>
                    )}
                  </div>
                </form>
              </Panel>

              <Panel title="定义关系">
                <form onSubmit={addRelation} className="space-y-3">
                  <Select label="成员 A" value={relationForm.from} onChange={(from) => setRelationForm({ ...relationForm, from })} options={data.members} />
                  <Select
                    label="关系"
                    value={relationForm.type}
                    onChange={(type) => setRelationForm({ ...relationForm, type })}
                    options={[
                      { id: "父母", name: "父母" },
                      { id: "配偶", name: "配偶" },
                      { id: "子女", name: "子女" },
                      { id: "兄弟姐妹", name: "兄弟姐妹" },
                      { id: "其他亲属", name: "其他亲属" },
                    ]}
                  />
                  <Select label="成员 B" value={relationForm.to} onChange={(to) => setRelationForm({ ...relationForm, to })} options={data.members} />
                  <button className="w-full rounded-md bg-moss px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#526f57]">
                    添加关系
                  </button>
                </form>
                <div className="mt-4 space-y-2">
                  {data.relations.map((relation) => (
                    <div key={relation.id} className="flex items-center justify-between gap-3 rounded-md bg-black/[0.035] px-3 py-2 text-sm">
                      <span>{memberName(relation.from)} · {relation.type} · {memberName(relation.to)}</span>
                      <button onClick={() => deleteRelation(relation.id)} className="text-rosewood hover:underline">删除</button>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <div className="space-y-5">
              <Panel title="家族关系图谱">
                <FamilyGraph graph={graph} relations={data.relations} memberName={memberName} />
              </Panel>
              <Panel title="成员名录">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {data.members.map((member) => (
                    <article key={member.id} className="rounded-lg border border-black/10 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold">{member.name}</h3>
                          <p className="mt-1 text-sm text-moss">{member.role || "家族成员"}</p>
                        </div>
                        <div className="flex gap-2 text-sm">
                          <button onClick={() => editMember(member)} className="text-lagoon hover:underline">编辑</button>
                          <button onClick={() => deleteMember(member.id)} className="text-rosewood hover:underline">删除</button>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-ink/65">{formatDate(member.birth)}</p>
                      <p className="mt-3 min-h-12 text-sm leading-6 text-ink/75">{member.bio || "还没有简介。"}</p>
                    </article>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        )}

        {activeTab === "gallery" && (
          <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
            <Panel title="添加照片">
              <form onSubmit={addPhoto} className="space-y-3">
                <Input label="标题" value={photoForm.title} onChange={(title) => setPhotoForm({ ...photoForm, title })} required />
                <Input label="图片 URL" value={photoForm.url} onChange={(url) => setPhotoForm({ ...photoForm, url })} placeholder="https://..." />
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-ink/75">或上传本地图片</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm" />
                </label>
                <Input label="时间 / 地点 / 人物" value={photoForm.meta} onChange={(meta) => setPhotoForm({ ...photoForm, meta })} />
                <Textarea label="描述" value={photoForm.description} onChange={(description) => setPhotoForm({ ...photoForm, description })} />
                <button className="w-full rounded-md bg-lagoon px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#356f78]">
                  加入照片墙
                </button>
              </form>
            </Panel>
            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.photos.map((photo) => (
                <article key={photo.id} className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
                  <img src={photo.url} alt={photo.title} className="h-56 w-full object-cover" />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold">{photo.title}</h3>
                      <button onClick={() => deletePhoto(photo.id)} className="text-sm text-rosewood hover:underline">删除</button>
                    </div>
                    <p className="mt-2 text-sm font-medium text-moss">{photo.meta || "未填写附加信息"}</p>
                    <p className="mt-3 text-sm leading-6 text-ink/75">{photo.description || "还没有描述。"}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
            <Panel title="记录大事">
              <form onSubmit={addEvent} className="space-y-3">
                <Input label="事件标题" value={eventForm.title} onChange={(title) => setEventForm({ ...eventForm, title })} required />
                <Input label="日期" type="date" value={eventForm.date} onChange={(date) => setEventForm({ ...eventForm, date })} required />
                <Textarea label="详情" value={eventForm.detail} onChange={(detail) => setEventForm({ ...eventForm, detail })} />
                <button className="w-full rounded-md bg-moss px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#526f57]">
                  添加到时间轴
                </button>
              </form>
            </Panel>
            <Panel title="家族时间轴">
              <div className="relative space-y-5 pl-5 before:absolute before:left-1 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-moss/35">
                {sortedEvents.map((item) => (
                  <article key={item.id} className="relative rounded-lg border border-black/10 bg-white p-4 shadow-sm before:absolute before:-left-[22px] before:top-5 before:h-3 before:w-3 before:rounded-full before:bg-rosewood">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-moss">{formatDate(item.date)}</p>
                        <h3 className="mt-1 text-lg font-bold">{item.title}</h3>
                      </div>
                      <button onClick={() => deleteEvent(item.id)} className="text-sm text-rosewood hover:underline">删除</button>
                    </div>
                    <p className="mt-3 leading-7 text-ink/75">{item.detail || "还没有详情。"}</p>
                  </article>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </section>
    </main>
  );
}

function buildGraph(members, relations) {
  if (!members.length) return { nodes: [], edges: [] };
  const width = 820;
  const height = 460;
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = Math.min(300, 130 + members.length * 28);
  const radiusY = Math.min(165, 90 + members.length * 16);
  const nodes = members.map((member, index) => {
    const angle = (Math.PI * 2 * index) / members.length - Math.PI / 2;
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
      <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-rosewood">Hometown</p>
        <h2 className="mt-3 text-2xl font-bold text-ink">家族根脉所在地</h2>
        <div className="mt-4 space-y-3 text-base leading-8 text-ink/75">
          <p>
            <span className="font-semibold text-ink">位置：</span>
            江西省抚州市崇仁县雷园村
          </p>
          <p>这里是家族记忆的地理锚点，和成员、照片、大事记一起记录下来，方便亲戚们在手机上快速确认老家位置。</p>
        </div>
        <a
          href="https://map.baidu.com/search/%E6%B1%9F%E8%A5%BF%E7%9C%81%E6%8A%9A%E5%B7%9E%E5%B8%82%E5%B4%87%E4%BB%81%E5%8E%BF%E9%9B%B7%E5%9B%AD%E6%9D%91"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
        >
          打开地图导航
        </a>
      </div>

      <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="relative aspect-[4/3] w-full bg-[#eef4ef] sm:aspect-[16/9]">
          <FallbackSlide title={current.title} />
          <img
            src={current.image}
            alt={current.title}
            className="relative z-10 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/65 to-transparent p-4 text-white">
            <p className="text-lg font-bold">{current.title}</p>
            <p className="mt-1 text-sm text-white/85">{current.caption}</p>
          </div>
          <button
            onClick={() => setActiveSlide((activeSlide - 1 + locationSlides.length) % locationSlides.length)}
            className="absolute left-3 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl font-bold text-ink shadow-sm"
            aria-label="上一张"
          >
            ‹
          </button>
          <button
            onClick={() => setActiveSlide((activeSlide + 1) % locationSlides.length)}
            className="absolute right-3 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl font-bold text-ink shadow-sm"
            aria-label="下一张"
          >
            ›
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 p-3">
          {locationSlides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => setActiveSlide(index)}
              className={`h-2.5 rounded-full transition-all ${
                activeSlide === index ? "w-8 bg-rosewood" : "w-2.5 bg-black/20"
              }`}
              aria-label={`查看${slide.title}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FallbackSlide({ title }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#e8f0ea,#f4e2b8)] px-6 text-center text-ink">
      <div>
        <p className="text-xl font-bold">{title}</p>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          请将图片放入 public 目录：location-map.svg 或 leiyuan-village.svg
        </p>
      </div>
    </div>
  );
}

function FamilyGraph({ graph, relations, memberName }) {
  if (!graph.nodes.length) {
    return <EmptyState text="先添加一位家族成员，关系图谱就会在这里出现。" />;
  }

  return (
    <div className="overflow-hidden rounded-lg bg-[#fdfbf6]">
      <svg viewBox={`0 0 ${graph.width} ${graph.height}`} className="h-[390px] w-full sm:h-[460px]">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#8f6b4a" />
          </marker>
        </defs>
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
              markerEnd={edge.type === "父母" || edge.type === "子女" ? "url(#arrow)" : ""}
            />
            <text
              x={(edge.fromNode.x + edge.toNode.x) / 2}
              y={(edge.fromNode.y + edge.toNode.y) / 2 - 8}
              textAnchor="middle"
              className="fill-ink text-[12px] font-semibold"
            >
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
      {relations.length > 0 && (
        <div className="grid gap-2 border-t border-black/10 bg-white/70 p-4 text-sm sm:grid-cols-2">
          {relations.map((relation) => (
            <span key={relation.id} className="rounded-md bg-white px-3 py-2 text-ink/75">
              {memberName(relation.from)} 与 {memberName(relation.to)}：{relation.type}
            </span>
          ))}
        </div>
      )}
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

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-white p-4">
      <p className="text-sm font-semibold text-ink/55">{label}</p>
      <p className="mt-1 text-3xl font-bold text-ink">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "", required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink/75">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-lagoon focus:ring-4 focus:ring-lagoon/10"
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
        className="w-full resize-none rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-lagoon focus:ring-4 focus:ring-lagoon/10"
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
        className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-lagoon focus:ring-4 focus:ring-lagoon/10"
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

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-black/20 bg-white p-8 text-center text-ink/60">
      {text}
    </div>
  );
}
