import { getMalwareAuditSummary, listRecentMalwareAudits } from "@/lib/malware-audit";

function formatFileSize(bytes: bigint | number | null): string {
  if (bytes == null) {
    return "-";
  }

  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 1024) {
    return `${value} B`;
  }

  const kb = value / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export default async function AdminSecurityPage() {
  const [summary, audits] = await Promise.all([
    getMalwareAuditSummary(24),
    listRecentMalwareAudits(50),
  ]);

  const cards = [
    { label: "Scans (24h)", value: summary.total },
    { label: "Infected", value: summary.infected },
    { label: "Auto-deleted", value: summary.deleted },
    { label: "Failures", value: summary.failed },
  ];

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Security</p>
        <h1 className="mt-2 font-display text-4xl text-white">Malware Scan Audits</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Audit stream for image upload scanning. Events include clean scans, infected detections, and scanner errors.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
            <p className="text-sm font-semibold text-slate-300">{card.label}</p>
            <p className="mt-2 font-display text-4xl text-sunset">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/3 shadow-lg">
        <div className="border-b border-white/10 px-5 py-3">
          <h2 className="font-display text-lg text-white">Recent Scan Events</h2>
        </div>

        {audits.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400">No malware scan events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.08em] text-slate-400">
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Result</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Size</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => (
                  <tr key={audit.id} className="border-b border-white/5 text-slate-200">
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {audit.createdAt.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3 font-medium">{audit.source}</td>
                    <td className="px-5 py-3">{audit.scanResult}</td>
                    <td className="px-5 py-3">{audit.actionTaken}</td>
                    <td className="px-5 py-3">{formatFileSize(audit.fileSizeBytes)}</td>
                    <td className="px-5 py-3">{audit.contentType ?? "-"}</td>
                    <td className="max-w-[28rem] truncate px-5 py-3 text-xs text-slate-400">{audit.details ?? "-"}</td>
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
