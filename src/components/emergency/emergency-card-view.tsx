"use client";

import { useState } from "react";
import { AlertTriangle, Droplet, HeartPulse, Phone, Pill, ShieldAlert, User } from "lucide-react";

import { logEmergencyAccessAction } from "@/app/(site)/emergency/[token]/actions";
import { Button } from "@/components/ui/button";

type Contact = { name: string; relationship: string; phone: string };

type EmergencyData = {
  contacts: Contact[];
  bloodType: string;
  allergies: string;
  conditions: string;
  medications: string;
  insuranceProvider: string;
  insurancePolicy: string;
  notes: string;
};

type EmergencyCardViewProps = {
  token: string;
  rider: { name: string; location: string | null };
  data: EmergencyData;
};

export function EmergencyCardView({ token, rider, data }: EmergencyCardViewProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  function acknowledge() {
    setAcknowledged(true);
    // Log the access, attaching GPS if the responder allows it. Never block on it.
    const finish = (lat: number | null, lng: number | null) => {
      void logEmergencyAccessAction(token, lat, lng);
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => finish(pos.coords.latitude, pos.coords.longitude),
        () => finish(null, null),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else {
      finish(null, null);
    }
  }

  if (!acknowledged) {
    return (
      <div className="rounded-xl border border-red-300 bg-white p-6 text-center shadow-soft">
        <ShieldAlert className="mx-auto h-10 w-10 text-red-600" />
        <h1 className="mt-3 font-display text-xl text-ink">Emergency Rider Information</h1>
        <p className="mt-2 text-sm text-muted">
          This card holds medical information for <strong>{rider.name}</strong>, intended for first
          responders and emergency use only. Accessing it is logged.
        </p>
        <Button variant="destructive" onClick={acknowledge} className="mt-5 w-full">
          I am accessing this for an emergency
        </Button>
        <a
          href="tel:911"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700"
        >
          <Phone className="h-4 w-4" />
          Call 911
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <a
        href="tel:911"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-base font-semibold text-white shadow-soft"
      >
        <Phone className="h-5 w-5" />
        Call 911
      </a>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <HeartPulse className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-lg text-ink">{rider.name}</h1>
            {rider.location && <p className="text-sm text-muted">{rider.location}</p>}
          </div>
        </div>

        {data.bloodType && (
          <Field icon={<Droplet className="h-4 w-4 text-red-600" />} label="Blood Type">
            <span className="text-base font-bold text-red-700">{data.bloodType}</span>
          </Field>
        )}
        {data.allergies && (
          <Field icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} label="Allergies">
            {data.allergies}
          </Field>
        )}
        {data.conditions && (
          <Field icon={<ShieldAlert className="h-4 w-4 text-amber-600" />} label="Medical Conditions">
            {data.conditions}
          </Field>
        )}
        {data.medications && (
          <Field icon={<Pill className="h-4 w-4 text-sunset" />} label="Medications">
            {data.medications}
          </Field>
        )}
        {(data.insuranceProvider || data.insurancePolicy) && (
          <Field icon={<ShieldAlert className="h-4 w-4 text-muted" />} label="Insurance">
            {[data.insuranceProvider, data.insurancePolicy].filter(Boolean).join(" · ")}
          </Field>
        )}
        {data.notes && (
          <Field icon={<AlertTriangle className="h-4 w-4 text-muted" />} label="Notes">
            {data.notes}
          </Field>
        )}
      </div>

      {data.contacts.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-asphalt">
            Emergency Contacts
          </h2>
          <div className="mt-3 space-y-2">
            {data.contacts.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-canvas p-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <User className="h-3.5 w-3.5 text-muted" />
                    {c.name || "Contact"}
                  </p>
                  {c.relationship && <p className="text-xs text-muted">{c.relationship}</p>}
                </div>
                {c.phone && (
                  <a
                    href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sunset px-3 py-2 text-xs font-semibold text-white"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted">
        Provided by District 76 Riders. This access has been logged.
      </p>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-muted">
        {icon}
        {label}
      </p>
      <div className="mt-1 whitespace-pre-line text-sm text-ink">{children}</div>
    </div>
  );
}
