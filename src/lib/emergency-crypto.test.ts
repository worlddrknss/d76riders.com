import { describe, expect, it } from "vitest";

import { decryptEmergencyPayload, encryptEmergencyPayload, type EmergencyPayload } from "@/lib/emergency-crypto";

const payload: EmergencyPayload = {
  contacts: [{ name: "Jane Rider", relationship: "Spouse", phone: "555-0100" }],
  bloodType: "O+",
  allergies: "penicillin",
  conditions: "",
  medications: "",
  insuranceProvider: "Acme",
  insurancePolicy: "X-123",
  notes: "In case of emergency",
};

describe("emergency vault crypto (AES-256-GCM envelope)", () => {
  it("round-trips a payload", () => {
    expect(decryptEmergencyPayload(encryptEmergencyPayload(payload))).toEqual(payload);
  });

  it("never leaves plaintext in the ciphertext", () => {
    const sealed = encryptEmergencyPayload(payload);
    expect(Buffer.from(sealed.encryptedData).toString("utf8")).not.toContain("penicillin");
  });

  it("rejects tampered ciphertext via the auth tag", () => {
    const sealed = encryptEmergencyPayload(payload);
    sealed.encryptedData[sealed.encryptedData.length - 1] ^= 0xff;
    expect(() => decryptEmergencyPayload(sealed)).toThrow();
  });
});
