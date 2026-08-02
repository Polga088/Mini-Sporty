"use client";

import { approveRegistration, rejectRegistration } from "@/app/actions/registrations";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle } from "lucide-react";

export function RegistrationActions({ userId }: { userId: string }) {
  return (
    <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:w-80">
      <form action={approveRegistration}>
        <input type="hidden" name="userId" value={userId} />
        <FormSubmitButton
          className="w-full"
          pendingLabel="Validation..."
          onClick={(event) => {
            if (!window.confirm("Approuver cette inscription et créer le wallet ?")) event.preventDefault();
          }}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Approuver
        </FormSubmitButton>
      </form>
      <form action={rejectRegistration} className="space-y-2">
        <input type="hidden" name="userId" value={userId} />
        <Input name="reason" placeholder="Motif optionnel" aria-label="Motif du refus" />
        <FormSubmitButton
          variant="destructive"
          className="w-full"
          pendingLabel="Refus..."
          onClick={(event) => {
            if (!window.confirm("Refuser cette inscription ? Le joueur ne pourra pas se connecter.")) event.preventDefault();
          }}
        >
          <XCircle className="h-4 w-4" aria-hidden="true" />
          Refuser
        </FormSubmitButton>
      </form>
    </div>
  );
}
