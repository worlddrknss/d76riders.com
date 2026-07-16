"use server";

import { AdminIncidentStatus, IncidentSeverity } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { diffFields, logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function requireModeratorUserId(): Promise<string> {
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id;

  if (!userId) {
    redirect("/admin");
  }

  const staff = await prisma.userRole.findFirst({
    where: { userId, role: { in: ["MODERATOR", "ADMINISTRATOR"] } },
    select: { id: true },
  });

  if (!staff) {
    redirect("/admin");
  }

  return userId;
}

function text(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}

function toSeverity(value: string): IncidentSeverity {
  return Object.values(IncidentSeverity).includes(value as IncidentSeverity)
    ? (value as IncidentSeverity)
    : "NORMAL";
}

function toStatus(value: string): AdminIncidentStatus {
  return Object.values(AdminIncidentStatus).includes(value as AdminIncidentStatus)
    ? (value as AdminIncidentStatus)
    : "OPEN";
}

export async function createIncidentAction(formData: FormData): Promise<void> {
  const userId = await requireModeratorUserId();

  const title = text(formData.get("title"));
  if (!title) {
    redirect("/admin/incidents/new?error=title");
  }

  const riderHandle = text(formData.get("riderHandle"));
  const eventSlug = text(formData.get("eventSlug"));

  // Staff type a handle/slug rather than an id, so resolve them — silently
  // leaving the link empty if there's no match rather than failing the create.
  const [rider, event] = await Promise.all([
    riderHandle
      ? prisma.rider.findUnique({ where: { handle: riderHandle }, select: { id: true } })
      : null,
    eventSlug ? prisma.rideEvent.findUnique({ where: { slug: eventSlug }, select: { id: true } }) : null,
  ]);

  const incident = await prisma.adminIncident.create({
    data: {
      title,
      summary: text(formData.get("summary")) || null,
      severity: toSeverity(text(formData.get("severity"))),
      riderId: rider?.id ?? null,
      eventId: event?.id ?? null,
      openedByUserId: userId,
    },
    select: { id: true, title: true, severity: true },
  });

  await logAudit({
    actorUserId: userId,
    action: "incident.create",
    entityType: "AdminIncident",
    entityId: incident.id,
    summary: `Opened incident "${incident.title}"`,
    after: { title: incident.title, severity: incident.severity, riderId: rider?.id ?? null },
  });

  redirect(`/admin/incidents/${incident.id}`);
}

export async function updateIncidentAction(incidentId: string, formData: FormData): Promise<void> {
  const userId = await requireModeratorUserId();

  const existing = await prisma.adminIncident.findUnique({
    where: { id: incidentId },
    select: { id: true, title: true, severity: true, status: true, summary: true, resolution: true },
  });

  if (!existing) {
    redirect("/admin/incidents");
  }

  const nextStatus = toStatus(text(formData.get("status")));
  const closing = nextStatus === "RESOLVED" || nextStatus === "CLOSED";
  const wasClosed = existing.status === "RESOLVED" || existing.status === "CLOSED";

  const next = {
    title: text(formData.get("title")) || existing.title,
    summary: text(formData.get("summary")) || null,
    severity: toSeverity(text(formData.get("severity"))),
    status: nextStatus,
    resolution: text(formData.get("resolution")) || null,
  };

  const { before, after } = diffFields(existing, next);

  await prisma.adminIncident.update({
    where: { id: incidentId },
    data: {
      ...next,
      // Stamp the closer on the transition into a closed state, and clear it if
      // the incident is reopened.
      closedByUserId: closing ? userId : null,
      closedAt: closing ? (wasClosed ? undefined : new Date()) : null,
    },
  });

  if (Object.keys(after).length > 0) {
    await logAudit({
      actorUserId: userId,
      action: closing && !wasClosed ? "incident.close" : "incident.update",
      entityType: "AdminIncident",
      entityId: incidentId,
      summary: `Updated incident "${next.title}"`,
      before,
      after,
    });
  }

  revalidatePath(`/admin/incidents/${incidentId}`);
  revalidatePath("/admin/incidents");
}

export async function addIncidentNoteAction(incidentId: string, formData: FormData): Promise<void> {
  const userId = await requireModeratorUserId();

  const body = text(formData.get("body"));
  if (!body) {
    return;
  }

  const incident = await prisma.adminIncident.findUnique({
    where: { id: incidentId },
    select: { id: true, title: true },
  });

  if (!incident) {
    redirect("/admin/incidents");
  }

  await prisma.adminIncidentNote.create({
    data: { incidentId, authorId: userId, body: body.slice(0, 5000) },
  });

  // The note body is intentionally not copied into the audit row — notes are
  // private case detail, and the audit trail records only that one was added.
  await logAudit({
    actorUserId: userId,
    action: "incident.note",
    entityType: "AdminIncident",
    entityId: incidentId,
    summary: `Added a private note to "${incident.title}"`,
  });

  revalidatePath(`/admin/incidents/${incidentId}`);
}
