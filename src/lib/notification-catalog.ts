/**
 * Notification routing: which categories reach a rider on which channel.
 *
 * Three channels, and riders choose per category. Stored as opt-outs — a
 * missing row means on — so a new category or channel is live for everyone
 * immediately instead of switched off until each rider goes looking for it.
 */

export const NOTIFICATION_CHANNELS = ["inApp", "push", "email"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  // "Bell" describes the icon, not the thing. This is the alerts inbox, which
  // is where it lands whether or not you ever look at the bell.
  inApp: "In-app",
  push: "Push",
  email: "Email",
};

export type NotificationCategory =
  | "mention"
  | "comment"
  | "rsvp"
  | "event"
  | "rideChange"
  | "reminder"
  | "weeklyRecap";

export type CategorySpec = {
  key: NotificationCategory;
  label: string;
  hint: string;
  /** Channels this category can actually use. */
  channels: NotificationChannel[];
};

/**
 * The catalogue the settings page renders and the senders check against.
 *
 * `channels` is per category because not every one makes sense everywhere: the
 * weekly recap is an email by definition, and offering a push toggle for it
 * would be a switch that does nothing.
 */
export const NOTIFICATION_CATEGORIES: CategorySpec[] = [
  {
    key: "mention",
    label: "Mentions",
    hint: "When another rider @mentions you in a journal post.",
    channels: ["inApp", "push", "email"],
  },
  {
    key: "comment",
    label: "Comments",
    hint: "When someone comments on your journal post.",
    channels: ["inApp", "push", "email"],
  },
  {
    key: "rsvp",
    label: "RSVPs",
    hint: "When a rider registers for a ride you organize.",
    channels: ["inApp", "push", "email"],
  },
  {
    key: "event",
    label: "Organizer messages",
    hint: "When an organizer messages riders of a ride you're on.",
    channels: ["inApp", "push", "email"],
  },
  {
    key: "rideChange",
    label: "Ride changes",
    hint: "When a ride you're on is cancelled, moved, or a waitlist spot opens for you.",
    channels: ["inApp", "push", "email"],
  },
  {
    key: "reminder",
    label: "Reminders",
    hint: "Your ride tomorrow, the recap after it, and maintenance coming due.",
    channels: ["inApp", "push", "email"],
  },
  {
    key: "weeklyRecap",
    label: "Weekly recap",
    hint: "A Monday summary of your week in riding.",
    channels: ["email"],
  },
];

/** Every valid route, for validating what a settings form posts back. */
const VALID_ROUTES = new Set(
  NOTIFICATION_CATEGORIES.flatMap((c) => c.channels.map((ch) => `${c.key}:${ch}`)),
);

export function isValidRoute(category: string, channel: string): boolean {
  return VALID_ROUTES.has(`${category}:${channel}`);
}

