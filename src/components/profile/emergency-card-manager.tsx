"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, HeartPulse, QrCode, RefreshCw, Trash2 } from "lucide-react";
import QRCode from "qrcode";

import {
  type EmergencyCardFormState,
  deleteEmergencyCardAction,
  regenerateEmergencyTokenAction,
  saveEmergencyCardAction,
  setEmergencyCardActiveAction,
} from "@/app/(site)/account/emergency-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type EmergencyContact = { name: string; relationship: string; phone: string };

export type EmergencyCardData = {
  token: string;
  active: boolean;
  showBloodType: boolean;
  showAllergies: boolean;
  showConditions: boolean;
  showMedications: boolean;
  showInsurance: boolean;
  payload: {
    contacts: EmergencyContact[];
    bloodType: string;
    allergies: string;
    conditions: string;
    medications: string;
    insuranceProvider: string;
    insurancePolicy: string;
    notes: string;
  };
};

const initialState: EmergencyCardFormState = { error: null, success: null };

const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-muted";

export function EmergencyCardManager({
  card,
  configured,
}: {
  card: EmergencyCardData | null;
  configured: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-asphalt">
          <HeartPulse className="h-4 w-4 text-red-600" />
          Emergency Card
        </h2>
        {card && (
          <span
            className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${
              card.active ? "bg-green-100 text-green-700" : "bg-canvas text-muted"
            }`}
          >
            {card.active ? "Active" : "Off"}
          </span>
        )}
      </div>

      {!configured ? (
        <p className="mt-3 text-xs text-muted">
          Emergency cards aren&apos;t enabled on this server yet.
        </p>
      ) : (
        <>
          <p className="mt-2 text-xs text-muted">
            Store encrypted medical info first responders can reach by scanning an NFC tag or QR code
            on your bike or helmet.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="accent" size="sm" onClick={() => setEditOpen(true)}>
              {card ? "Edit Card" : "Set Up Card"}
            </Button>
          </div>

          {card && <EmergencyCardControls card={card} />}
        </>
      )}

      <EmergencyCardDialog card={card} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

function EmergencyCardControls({ card }: { card: EmergencyCardData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const path = `/emergency/${card.token}`;

  useEffect(() => {
    if (!qrOpen) return;
    const url = `${window.location.origin}${path}`;
    QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: "#1a1d23", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [qrOpen, path]);

  function copyLink() {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied!" : "Copy Link"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setQrOpen(true)} className="gap-1.5">
          <QrCode className="h-3.5 w-3.5" />
          QR Code
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setEmergencyCardActiveAction(!card.active);
              router.refresh();
            })
          }
        >
          {card.active ? "Deactivate" : "Reactivate"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await regenerateEmergencyTokenAction();
              router.refresh();
            })
          }
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          New Link
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete your emergency card? This cannot be undone.")) return;
            startTransition(async () => {
              await deleteEmergencyCardAction();
              router.refresh();
            });
          }}
          className="gap-1.5 text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Emergency Card QR</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Emergency card QR code" width={280} height={280} className="rounded-lg border border-border" />
            ) : (
              <div className="flex h-[280px] w-[280px] items-center justify-center rounded-lg border border-border text-sm text-muted">
                Generating…
              </div>
            )}
            <p className="text-center text-xs text-muted">
              Print this or write it to an NFC tag. Anyone who scans it can view your visible emergency
              info.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmergencyCardDialog({
  card,
  open,
  onOpenChange,
}: {
  card: EmergencyCardData | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(saveEmergencyCardAction, initialState);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onOpenChange(false);
    }
  }, [state.success, router, onOpenChange]);

  const p = card?.payload;
  const contact = (i: number): EmergencyContact => p?.contacts[i] ?? { name: "", relationship: "", phone: "" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Emergency Card</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="mt-3 space-y-4">
          <label className="flex items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={card?.active ?? true} className="rounded" />
            <span className="font-medium text-ink">Card is active (viewable when scanned)</span>
          </label>

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-sunset">Emergency Contacts</legend>
            {[0, 1, 2].map((i) => {
              const c = contact(i);
              return (
                <div key={i} className="grid gap-2 sm:grid-cols-3">
                  <input name={`contactName${i}`} defaultValue={c.name} placeholder={`Contact ${i + 1} name`} className={inputClass.replace("mt-1 ", "")} />
                  <input name={`contactRelationship${i}`} defaultValue={c.relationship} placeholder="Relationship" className={inputClass.replace("mt-1 ", "")} />
                  <input name={`contactPhone${i}`} defaultValue={c.phone} placeholder="Phone" className={inputClass.replace("mt-1 ", "")} />
                </div>
              );
            })}
          </fieldset>

          <MedicalField label="Blood Type" name="bloodType" toggle="showBloodType" defaultValue={p?.bloodType ?? ""} defaultVisible={card?.showBloodType ?? true} />
          <MedicalField label="Allergies" name="allergies" toggle="showAllergies" defaultValue={p?.allergies ?? ""} defaultVisible={card?.showAllergies ?? true} textarea />
          <MedicalField label="Medical Conditions" name="conditions" toggle="showConditions" defaultValue={p?.conditions ?? ""} defaultVisible={card?.showConditions ?? true} textarea />
          <MedicalField label="Medications" name="medications" toggle="showMedications" defaultValue={p?.medications ?? ""} defaultVisible={card?.showMedications ?? true} textarea />

          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className={labelClass}>Insurance</span>
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" name="showInsurance" defaultChecked={card?.showInsurance ?? false} className="rounded" />
                Show on card
              </label>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input name="insuranceProvider" defaultValue={p?.insuranceProvider ?? ""} placeholder="Provider" className={inputClass.replace("mt-1 ", "")} />
              <input name="insurancePolicy" defaultValue={p?.insurancePolicy ?? ""} placeholder="Policy #" className={inputClass.replace("mt-1 ", "")} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes (always shown)</label>
            <textarea name="notes" rows={2} defaultValue={p?.notes ?? ""} placeholder="Anything else first responders should know." className={inputClass} />
          </div>

          <p className="rounded-md bg-canvas px-3 py-2 text-xs text-muted">
            Medical details are encrypted at rest. Only fields you mark &quot;show on card&quot; appear to
            someone who scans your code.
          </p>

          {state.error ? (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="accent" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save Card"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MedicalField({
  label,
  name,
  toggle,
  defaultValue,
  defaultVisible,
  textarea,
}: {
  label: string;
  name: string;
  toggle: string;
  defaultValue: string;
  defaultVisible: boolean;
  textarea?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <span className={labelClass}>{label}</span>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" name={toggle} defaultChecked={defaultVisible} className="rounded" />
          Show on card
        </label>
      </div>
      {textarea ? (
        <textarea name={name} rows={2} defaultValue={defaultValue} className={inputClass} />
      ) : (
        <input name={name} defaultValue={defaultValue} className={inputClass} />
      )}
    </div>
  );
}
