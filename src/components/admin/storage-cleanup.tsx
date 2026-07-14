"use client";

import { useState, useTransition } from "react";
import { HardDrive, Search, Trash2 } from "lucide-react";

import { type OrphanScanResult, scanOrphanedImagesAction, deleteOrphanedImagesAction } from "@/app/admin/storage/actions";
import { Button } from "@/components/ui/button";

export function StorageCleanup() {
  const [scanResult, setScanResult] = useState<OrphanScanResult | null>(null);
  const [scanPending, startScanTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteCount, setDeleteCount] = useState<number | null>(null);

  function handleScan() {
    startScanTransition(async () => {
      const result = await scanOrphanedImagesAction();
      setScanResult(result);
      setDeleteCount(null);
    });
  }

  function handleDelete() {
    if (!scanResult || scanResult.orphanedKeys.length === 0) return;
    startDeleteTransition(async () => {
      const count = await deleteOrphanedImagesAction(scanResult.orphanedKeys);
      setDeleteCount(count);
      setScanResult(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/3 p-6 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HardDrive className="h-5 w-5 text-sunset" />
            <div>
              <h2 className="text-lg font-semibold text-white">Orphaned Image Scanner</h2>
              <p className="text-sm text-slate-400">Compares all S3 objects against database references</p>
            </div>
          </div>
          <Button variant="accent" size="sm" onClick={handleScan} disabled={scanPending} className="gap-1.5">
            <Search className="h-3.5 w-3.5" />
            {scanPending ? "Scanning…" : "Scan Now"}
          </Button>
        </div>

        {deleteCount !== null && (
          <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Successfully deleted {deleteCount} orphaned file{deleteCount !== 1 ? "s" : ""}.
          </div>
        )}

        {scanResult && (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">S3 Objects</p>
                <p className="mt-1 font-display text-2xl font-bold text-white">{scanResult.totalS3Keys}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Referenced</p>
                <p className="mt-1 font-display text-2xl font-bold text-emerald-300">{scanResult.referencedKeys}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Orphaned</p>
                <p className="mt-1 font-display text-2xl font-bold text-red-300">{scanResult.orphanedKeys.length}</p>
              </div>
            </div>

            {scanResult.orphanedKeys.length > 0 ? (
              <>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02]">
                  <table className="min-w-full text-sm text-slate-300">
                    <thead className="sticky top-0 bg-white/[0.05] text-xs uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="px-4 py-2 text-left">Key</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {scanResult.orphanedKeys.map((key) => (
                        <tr key={key}>
                          <td className="px-4 py-2 font-mono text-xs">{key}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button variant="accent" size="sm" onClick={handleDelete} disabled={deletePending} className="gap-1.5 bg-red-600 hover:bg-red-700">
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletePending ? "Deleting…" : `Delete ${scanResult.orphanedKeys.length} Orphaned Files`}
                </Button>
              </>
            ) : (
              <p className="text-sm text-emerald-300">No orphaned files found. Storage is clean.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
