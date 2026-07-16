import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Envelope encryption for rider emergency/medical data.
//
// A per-card random Data Encryption Key (DEK) encrypts the medical JSON payload
// with AES-256-GCM. The DEK is itself encrypted ("wrapped") with the master Key
// Encryption Key (KEK) held in EMERGENCY_MASTER_KEY. Only the wrapped DEK and the
// ciphertext are stored — the plaintext DEK never touches the database.
//
// Rotating EMERGENCY_MASTER_KEY requires re-wrapping every card's DEK; losing it
// makes existing cards permanently unreadable. Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

let cachedKek: Buffer | null = null;

function loadKek(): Buffer {
  if (cachedKek) return cachedKek;

  const raw = process.env.EMERGENCY_MASTER_KEY;
  if (!raw) {
    throw new Error(
      "EMERGENCY_MASTER_KEY is not set. Emergency cards cannot be encrypted or decrypted.",
    );
  }

  // Accept base64 or hex; both must decode to exactly 32 bytes.
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw.trim())) {
    key = Buffer.from(raw.trim(), "hex");
  } else {
    key = Buffer.from(raw.trim(), "base64");
  }

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `EMERGENCY_MASTER_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}). Use a base64 or hex 256-bit key.`,
    );
  }

  cachedKek = key;
  return key;
}

export function isEmergencyCryptoConfigured(): boolean {
  try {
    loadKek();
    return true;
  } catch {
    return false;
  }
}

// Layout: [iv (12)][authTag (16)][ciphertext]
function seal(key: Buffer, plaintext: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]);
}

function open(key: Buffer, sealed: Uint8Array): Buffer {
  const iv = sealed.subarray(0, IV_BYTES);
  const tag = sealed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = sealed.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export type EmergencyPayload = {
  contacts: Array<{ name: string; relationship: string; phone: string }>;
  bloodType: string;
  allergies: string;
  conditions: string;
  medications: string;
  insuranceProvider: string;
  insurancePolicy: string;
  notes: string;
};

// Copy into a Uint8Array backed by a plain ArrayBuffer — the exact shape
// Prisma's Bytes columns expect (Uint8Array<ArrayBuffer>).
function toBytes(buf: Buffer): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(buf.byteLength);
  out.set(buf);
  return out;
}

export type SealedCard = {
  encryptedData: Uint8Array<ArrayBuffer>;
  dekCiphertext: Uint8Array<ArrayBuffer>;
};

export function encryptEmergencyPayload(payload: EmergencyPayload): SealedCard {
  const kek = loadKek();
  const dek = randomBytes(KEY_BYTES);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  return {
    encryptedData: toBytes(seal(dek, plaintext)),
    dekCiphertext: toBytes(seal(kek, dek)),
  };
}

export function decryptEmergencyPayload(card: SealedCard): EmergencyPayload {
  const kek = loadKek();
  const dek = open(kek, card.dekCiphertext);
  const plaintext = open(dek, card.encryptedData);
  return JSON.parse(plaintext.toString("utf8")) as EmergencyPayload;
}
