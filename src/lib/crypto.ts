export const generateSalt = () => crypto.getRandomValues(new Uint8Array(16));
export const generateIv = () => crypto.getRandomValues(new Uint8Array(12));

const bytesToBase64 = (bytes: ArrayBuffer | Uint8Array) => {
  const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of uint8) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const base64ToBytes = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const getPasswordKey = async (password: string) => {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
};

export const deriveKey = async (password: string, salt: Uint8Array) => {
  const passwordKey = await getPasswordKey(password);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 600_000,
      hash: "SHA-256",
    } as Pbkdf2Params,
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export const encryptText = async (text: string, password: string) => {
  const salt = generateSalt();
  const iv = generateIv();
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    enc.encode(text)
  );

  return {
    ciphertext: bytesToBase64(ciphertextBuffer),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
  };
};

export const decryptText = async (
  ciphertextBase64: string,
  saltBase64: string,
  ivBase64: string,
  password: string
) => {
  const salt = base64ToBytes(saltBase64);
  const iv = base64ToBytes(ivBase64);
  const ciphertext = base64ToBytes(ciphertextBase64);

  const key = await deriveKey(password, salt);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
};

export const encryptFile = async (fileBuffer: ArrayBuffer, password: string) => {
  const salt = generateSalt();
  const iv = generateIv();
  const key = await deriveKey(password, salt);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    fileBuffer
  );

  return {
    ciphertextBuffer,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
  };
};

export const decryptFile = async (
  encryptedBuffer: ArrayBuffer,
  saltBase64: string,
  ivBase64: string,
  password: string
) => {
  const salt = base64ToBytes(saltBase64);
  const iv = base64ToBytes(ivBase64);
  const key = await deriveKey(password, salt);

  return await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedBuffer
  );
};
