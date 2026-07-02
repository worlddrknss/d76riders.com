"use server";

import { redirect } from "next/navigation";

import { AuthenticationError, AuthorizationError, requireUserRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { deleteFileByUrl } from "@/lib/s3";

export async function deleteNewsPostAction(slug: string): Promise<void> {
  const currentUser = await getCurrentUser();

  try {
    await requireUserRole(currentUser?.id, "ADMINISTRATOR");
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      redirect("/news");
    }
    redirect("/news");
  }

  const post = await prisma.newsPost.findUnique({
    where: { slug },
    select: {
      id: true,
      coverImageUrl: true,
    },
  });

  if (!post) {
    redirect("/news");
  }

  await prisma.newsPost.delete({ where: { id: post.id } });
  await deleteFileByUrl(post.coverImageUrl);

  redirect("/news");
}
