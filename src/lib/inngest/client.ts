import { Inngest } from "inngest";

/**
 * Inngest client for durable background + scheduled work (weekly recaps,
 * notification digests, push delivery, story expiry, momentum recompute).
 *
 * Connects to the self-hosted Inngest server in-cluster. Connection config is
 * read from env by the SDK: INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY,
 * INNGEST_BASE_URL, INNGEST_SERVE_ORIGIN, INNGEST_DEV.
 */
export const inngest = new Inngest({ id: "d76riders" });
