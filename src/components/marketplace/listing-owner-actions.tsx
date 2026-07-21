"use client";

import { useTransition } from "react";
import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";

import { deleteListingAction, setListingStatusAction } from "@/app/(site)/marketplace/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function ListingOwnerActions({ listingId, sold }: { listingId: string; sold: boolean }) {
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {sold ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => start(() => setListingStatusAction(listingId, "ACTIVE"))}
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Relist
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => start(() => setListingStatusAction(listingId, "SOLD"))}
          className="gap-1.5"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-forest" /> Mark sold
        </Button>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-red-600 hover:text-red-700">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the listing and its photos. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => start(() => deleteListingAction(listingId))} disabled={pending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
