"use server";

import { PolicyType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { diffFields, logAudit } from "@/lib/audit";
import { requireUserRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/sanitize";
import { getCurrentUser } from "@/lib/session";

// Publishing policy text is an administrator action — moderators triage content,
// but they don't set the rules members must accept.
async function requireAdminUserId(): Promise<string> {
  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/admin");
  }

  try {
    await requireUserRole(currentUser.id, "ADMINISTRATOR");
  } catch {
    redirect("/admin");
  }

  return currentUser.id;
}

function text(value: FormDataEntryValue | null): string {
  return (value?.toString() ?? "").trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function toType(value: string): PolicyType {
  return Object.values(PolicyType).includes(value as PolicyType)
    ? (value as PolicyType)
    : "COMMUNITY_GUIDELINES";
}

export async function createPolicyAction(formData: FormData): Promise<void> {
  const userId = await requireAdminUserId();

  const title = text(formData.get("title"));
  const bodyHtml = sanitizeRichText(text(formData.get("bodyHtml")));

  if (!title || !bodyHtml) {
    redirect("/admin/policies/new?error=missing");
  }

  const slug = slugify(text(formData.get("slug")) || title);

  const clash = await prisma.policy.findUnique({ where: { slug }, select: { id: true } });
  if (clash) {
    redirect("/admin/policies/new?error=slug");
  }

  const policy = await prisma.policy.create({
    data: {
      slug,
      title,
      summary: text(formData.get("summary")) || null,
      bodyHtml,
      type: toType(text(formData.get("type"))),
      version: text(formData.get("version")) || "1",
      required: formData.get("required") === "on",
      active: formData.get("active") === "on",
    },
    select: { id: true, title: true, slug: true, version: true, type: true, required: true },
  });

  await logAudit({
    actorUserId: userId,
    action: "policy.create",
    entityType: "Policy",
    entityId: policy.id,
    summary: `Published policy "${policy.title}" v${policy.version}`,
    after: policy,
  });

  revalidatePath("/admin/policies");
  revalidatePath("/policies");
  redirect("/admin/policies");
}

export async function updatePolicyAction(policyId: string, formData: FormData): Promise<void> {
  const userId = await requireAdminUserId();

  const existing = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!existing) {
    redirect("/admin/policies");
  }

  const next = {
    title: text(formData.get("title")) || existing.title,
    summary: text(formData.get("summary")) || null,
    bodyHtml: sanitizeRichText(text(formData.get("bodyHtml"))) || existing.bodyHtml,
    type: toType(text(formData.get("type"))),
    version: text(formData.get("version")) || existing.version,
    required: formData.get("required") === "on",
    active: formData.get("active") === "on",
  };

  const { before, after } = diffFields(existing, next);

  await prisma.policy.update({ where: { id: policyId }, data: next });

  if (Object.keys(after).length > 0) {
    await logAudit({
      actorUserId: userId,
      action: "policy.update",
      entityType: "Policy",
      entityId: policyId,
      summary:
        before.version !== undefined
          ? `Bumped "${next.title}" to v${next.version} — all members must re-accept`
          : `Updated policy "${next.title}"`,
      before,
      after,
    });
  }

  revalidatePath("/admin/policies");
  revalidatePath(`/policies/${existing.slug}`);
  revalidatePath("/policies");
  redirect("/admin/policies");
}

export async function deletePolicyAction(policyId: string): Promise<void> {
  const userId = await requireAdminUserId();

  const existing = await prisma.policy.findUnique({
    where: { id: policyId },
    select: { id: true, title: true, slug: true, version: true },
  });

  if (!existing) {
    revalidatePath("/admin/policies");
    return;
  }

  await prisma.policy.delete({ where: { id: policyId } });

  await logAudit({
    actorUserId: userId,
    action: "policy.delete",
    entityType: "Policy",
    entityId: policyId,
    summary: `Deleted policy "${existing.title}" and its acknowledgments`,
    before: existing,
  });

  revalidatePath("/admin/policies");
  revalidatePath("/policies");
}
