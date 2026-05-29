import { useFamilyMembers } from "./useFamilyMembers";

export default function CloudFamilyGraph() {
  const { graph, loading, error } = useFamilyMembers();

  if (loading) return <StateCard text="正在读取家族成员..." />;
  if (error) return <StateCard text={`读取失败：${error}`} tone="error" />;
  if (!graph.nodes.length) return <StateCard text="还没有成员，先添加第一位家人。" />;

  return (
    <section className="rounded-lg bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">家族关系图谱</h2>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          云端同步
        </span>
      </div>

      <div className="overflow-auto rounded-lg border border-slate-200 bg-[#fdfaf3] touch-pan-x touch-pan-y">
        <svg
          viewBox={`0 0 ${graph.width} ${graph.height}`}
          className="h-[420px] min-w-[760px] sm:min-w-full"
          role="img"
          aria-label="家族成员关系图谱"
        >
          <defs>
            <marker id="cloud-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#8b6f47" />
            </marker>
          </defs>

          {graph.edges.map((edge) => (
            <g key={edge.id}>
              <line
                x1={edge.fromNode.x}
                y1={edge.fromNode.y}
                x2={edge.toNode.x}
                y2={edge.toNode.y}
                stroke={edge.type === "配偶" ? "#a45c54" : "#8b6f47"}
                strokeWidth="3"
                strokeDasharray={edge.type === "配偶" ? "0" : "8 8"}
                markerEnd={edge.type === "父母" || edge.type === "子女" ? "url(#cloud-arrow)" : ""}
              />
              <text
                x={(edge.fromNode.x + edge.toNode.x) / 2}
                y={(edge.fromNode.y + edge.toNode.y) / 2 - 10}
                textAnchor="middle"
                className="fill-slate-800 text-[13px] font-bold"
              >
                {edge.type}
              </text>
            </g>
          ))}

          {graph.nodes.map((node) => (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r="54" fill="#ffffff" stroke="#55735b" strokeWidth="3" />
              <circle cx={node.x} cy={node.y - 20} r="15" fill="#f1d7a2" />
              <text x={node.x} y={node.y + 8} textAnchor="middle" className="fill-slate-900 text-[16px] font-bold">
                {node.name}
              </text>
              <text x={node.x} y={node.y + 30} textAnchor="middle" className="fill-[#55735b] text-[12px] font-semibold">
                {node.role || "成员"}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

function StateCard({ text, tone = "normal" }) {
  return (
    <div
      className={`rounded-lg p-5 text-sm font-semibold ${
        tone === "error" ? "bg-red-50 text-red-700" : "bg-white text-slate-600"
      }`}
    >
      {text}
    </div>
  );
}
