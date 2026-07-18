import { storiesExpiry } from "./stories-expiry";
import { weeklyRecap } from "./weekly-recap";

/** All Inngest functions served at /api/inngest. */
export const functions = [weeklyRecap, storiesExpiry];
