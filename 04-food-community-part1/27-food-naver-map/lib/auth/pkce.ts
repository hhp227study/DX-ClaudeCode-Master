import { createHash, randomBytes } from "node:crypto";

/** OAuth PKCE verifier/challenge 쌍. verifier는 httpOnly 쿠키에 보관하고 challenge만 인가 URL에 실어 보낸다. */
export function createPkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
