import type { Metadata } from "next";
import Link from "next/link";
import { galleryItems } from "@/data/community";
import { siteImages } from "@/data/images";
import { PageHero } from "@/components/layout/page-hero";
import { StaggerList, StaggerItem } from "@/components/ui/motion";

export const metadata: Metadata = {
  title: "Gallery — Ride Photos & Community Moments",
  description:
    "Browse photos from District 76 group rides, meetups, and road adventures in Tennessee and beyond.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: "Gallery — District 76 Riders",
    description: "Photos from rides, meetups, and the open road.",
  },
};

export default function GalleryPage() {
  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.gallery}
        eyebrow="Gallery"
        title="District 76 Moments"
        description="Rides, road stops, and the people who make the Clarksville motorcycle community worth showing up for."
      />

      {/* PHOTO MOSAIC */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {galleryItems.map((item, index) => (
              <StaggerItem key={item}>
              <figure
                className={`group relative overflow-hidden rounded-xl border border-border shadow-soft ${index % 5 === 0 ? "sm:col-span-2" : ""}`}
              >
                <div
                  className="h-56 w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105 sm:h-64"
                  style={{ backgroundImage: `url(${siteImages.galleryPage[index % siteImages.galleryPage.length]})` }}
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-asphalt/90 to-transparent p-4 text-sm font-medium text-white">
                  {item}
                </figcaption>
              </figure>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-soft sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sunset">Want to be featured?</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl">Share Your Ride Shots</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted">
              Community uploads and ride-day photo collections are expanding in the next phase.
            </p>
            <Link href="/join" className="mt-6 inline-flex rounded-md bg-sunset px-6 py-3 text-sm font-semibold text-white hover:bg-[#cf5a26]">
              Join the Community
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
