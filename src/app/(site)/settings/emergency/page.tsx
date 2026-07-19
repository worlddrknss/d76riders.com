import { redirect } from "next/navigation";

import { SettingsNav } from "@/components/account/settings-nav";
import { AppShell } from "@/components/layout/app-shell";
import { EmergencyAccessLog } from "@/components/profile/emergency-access-log";
import { EmergencyCardManager, type EmergencyCardData } from "@/components/profile/emergency-card-manager";
import { decryptEmergencyPayload, isEmergencyCryptoConfigured } from "@/lib/emergency-crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Emergency — Settings", robots: { index: false, follow: false } };

export default async function EmergencySettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?next=/settings/emergency");
  const rider = await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } });
  if (!rider) redirect("/login");

  const emergencyConfigured = isEmergencyCryptoConfigured();
  let emergencyCard: EmergencyCardData | null = null;
  let emergencyAccesses: {
    id: string;
    createdAt: Date;
    address: string | null;
    ip: string | null;
    userAgent: string | null;
    lat: number | null;
    lng: number | null;
  }[] = [];

  const cardRow = await prisma.emergencyCard.findUnique({ where: { riderId: rider.id } });
  if (cardRow) {
    emergencyAccesses = await prisma.emergencyCardAccess.findMany({
      where: { cardId: cardRow.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, createdAt: true, address: true, ip: true, userAgent: true, lat: true, lng: true },
    });
  }
  if (cardRow && emergencyConfigured) {
    try {
      emergencyCard = {
        token: cardRow.token,
        active: cardRow.active,
        showBloodType: cardRow.showBloodType,
        showAllergies: cardRow.showAllergies,
        showConditions: cardRow.showConditions,
        showMedications: cardRow.showMedications,
        showInsurance: cardRow.showInsurance,
        payload: decryptEmergencyPayload({
          encryptedData: cardRow.encryptedData,
          dekCiphertext: cardRow.dekCiphertext,
        }),
      };
    } catch {
      emergencyCard = null;
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="max-w-3xl space-y-4">
          <h1 className="font-display text-3xl font-semibold text-ink">Settings</h1>
          <SettingsNav />
        </div>
        <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
          <div>
            <EmergencyCardManager card={emergencyCard} configured={emergencyConfigured} />
          </div>
          <EmergencyAccessLog accesses={emergencyAccesses} />
        </div>
      </div>
    </AppShell>
  );
}
