"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { submitSponsorAction, type SponsorSubmitState } from "@/app/(site)/shops/actions";
import { LocationAutocomplete } from "@/components/events/location-autocomplete";
import { SHOP_CATEGORIES, SHOP_CATEGORY_LABEL } from "@/lib/shops";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initialState: SponsorSubmitState = { error: null, success: null };

export function SubmitSponsorDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<SponsorSubmitState, FormData>(
    submitSponsorAction,
    initialState,
  );

  return (
    <>
      <Button variant="accent" onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Put a Business Forward
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Put a Business Forward</DialogTitle>
          </DialogHeader>

          {state.success ? (
            <div className="mt-3 space-y-4">
              <p className="rounded-md border border-forest/40 bg-forest/10 px-3 py-2 text-sm text-forest">
                {state.success}
              </p>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">
                Know a shop, cafe, or stop that looks after riders? Tell us about them. Someone will take a
                look before they go up.
              </p>

              <form action={formAction} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="sp-name" className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Business name
                  </label>
                  <Input id="sp-name" name="name" required maxLength={120} placeholder="Clarksville Moto Works" className="mt-1" />
                </div>

                <div>
                  <label htmlFor="sp-desc" className="text-xs font-semibold uppercase tracking-wide text-muted">
                    What they do
                  </label>
                  <Textarea
                    id="sp-desc"
                    name="description"
                    rows={3}
                    required
                    maxLength={300}
                    placeholder="Tires, service, and a decent coffee while you wait."
                    className="mt-1"
                  />
                </div>

                <div>
                  <label htmlFor="sp-cat" className="text-xs font-semibold uppercase tracking-wide text-muted">
                    What kind of business
                  </label>
                  <select
                    id="sp-cat"
                    name="category"
                    required
                    defaultValue=""
                    className="mt-1 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-sunset/50 focus:outline-none"
                  >
                    <option value="" disabled>
                      Pick one…
                    </option>
                    {SHOP_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {SHOP_CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* The same place search the event form uses, so a shop lands on the
                    real forecourt and keeps an address even where the map data has
                    no street for it. Only the address and coordinates are stored;
                    the search box is just how you find the place. */}
                <LocationAutocomplete
                  fieldPrefix="shop"
                  label="Where is it"
                  placeholder="Search the business or its address…"
                  hint="Search for the business to pin it on the map. Correct the address by hand if the search gets it wrong."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="sp-phone" className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Phone <span className="font-normal normal-case tracking-normal text-muted/70">(optional)</span>
                    </label>
                    <Input id="sp-phone" name="phone" maxLength={40} placeholder="(931) 555-0100" className="mt-1" />
                  </div>
                  <div>
                    <label htmlFor="sp-web" className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Website <span className="font-normal normal-case tracking-normal text-muted/70">(optional)</span>
                    </label>
                    <Input id="sp-web" name="websiteUrl" type="url" placeholder="https://…" className="mt-1" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="sp-cname" className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Contact name
                    </label>
                    <Input id="sp-cname" name="contactName" maxLength={120} className="mt-1" />
                  </div>
                  <div>
                    <label htmlFor="sp-cemail" className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Contact email
                    </label>
                    <Input id="sp-cemail" name="contactEmail" type="email" maxLength={254} className="mt-1" />
                  </div>
                </div>
                <p className="text-xs text-muted">
                  Contact details are for the team only — they never appear on the public page.
                </p>

                {state.error ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.error}
                  </p>
                ) : null}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="accent">
                    Submit for Review
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
