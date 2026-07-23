import type { Metadata } from "next";
import { AlertOctagon } from "lucide-react";

import { EmergencyCardView } from "@/components/emergency/emergency-card-view";
import { decryptEmergencyPayload, isEmergencyCryptoConfigured } from "@/lib/emergency-crypto";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Emergency Rider Info",
  robots: { index: false, follow: false },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="page-shell">
      <div className="mx-auto max-w-md px-4 py-8">{children}</div>
    </section>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-soft">
        <AlertOctagon className="mx-auto h-8 w-8 text-muted" />
        <h1 className="mt-3 font-display text-xl text-ink">{title}</h1>
        <p className="mt-2 text-sm text-muted">{body}</p>
      </div>
    </Shell>
  );
}

export default async function EmergencyCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!isEmergencyCryptoConfigured()) {
    return <Notice title="Emergency card unavailable" body="This service is not currently configured." />;
  }

  const card = await prisma.emergencyCard.findUnique({
    where: { token },
    select: {
      active: true,
      encryptedData: true,
      dekCiphertext: true,
      showBloodType: true,
      showAllergies: true,
      showConditions: true,
      showMedications: true,
      showInsurance: true,
      rider: { select: { name: true, handle: true, location: true, avatarUrl: true } },
    },
  });

  if (!card) {
    return <Notice title="Card not found" body="This emergency card link is invalid or no longer exists." />;
  }

  if (!card.active) {
    return (
      <Notice
        title="This emergency card has been deactivated"
        body="The rider has turned off access to this card."
      />
    );
  }

  let payload;
  try {
    payload = decryptEmergencyPayload({
      encryptedData: card.encryptedData,
      dekCiphertext: card.dekCiphertext,
    });
  } catch {
    return <Notice title="Unable to read card" body="This emergency card could not be decrypted." />;
  }

  // Apply visibility toggles — hidden fields never reach the browser.
  const visible = {
    contacts: payload.contacts,
    bloodType: card.showBloodType ? payload.bloodType : "",
    allergies: card.showAllergies ? payload.allergies : "",
    conditions: card.showConditions ? payload.conditions : "",
    medications: card.showMedications ? payload.medications : "",
    insuranceProvider: card.showInsurance ? payload.insuranceProvider : "",
    insurancePolicy: card.showInsurance ? payload.insurancePolicy : "",
    notes: payload.notes,
  };

  return (
    <Shell>
      <EmergencyCardView
        token={token}
        rider={{ name: card.rider.name, location: card.rider.location }}
        data={visible}
      />
    </Shell>
  );
}
