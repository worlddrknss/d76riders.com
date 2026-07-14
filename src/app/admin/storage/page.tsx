import { StorageCleanup } from "@/components/admin/storage-cleanup";

export default function AdminStoragePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Maintenance</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">Storage Cleanup</h1>
        <p className="mt-2 text-sm text-slate-300">Scan for orphaned images in S3 that are no longer referenced by any database record.</p>
      </div>
      <StorageCleanup />
    </div>
  );
}
