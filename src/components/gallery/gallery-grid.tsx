interface GalleryGridProps {
  items: string[];
}

export function GalleryGrid({ items }: GalleryGridProps) {
  return (
    <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
      {items.map((item, index) => (
        <figure
          key={item}
          className={`break-inside-avoid rounded-[1.5rem] border border-border bg-surface p-4 shadow-soft ${index % 3 === 0 ? "min-h-52" : index % 3 === 1 ? "min-h-64" : "min-h-44"}`}
        >
          <div className="mb-3 h-24 rounded-xl border border-border bg-ridge" aria-hidden="true" />
          <figcaption className="text-sm text-muted">{item}</figcaption>
        </figure>
      ))}
    </div>
  );
}
