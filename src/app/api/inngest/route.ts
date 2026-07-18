import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

// Serves the Inngest functions to the self-hosted Inngest server. Auth is handled
// by the SDK via INNGEST_SIGNING_KEY; the app registers on startup with a
// PUT /api/inngest (deployment postStart hook).
export const { GET, POST, PUT } = serve({ client: inngest, functions });
