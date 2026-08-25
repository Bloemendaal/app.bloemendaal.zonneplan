import { createHash, randomBytes } from "node:crypto";

/**
 * 32 random bytes base64url-encode to 43 characters, the shortest
 * `code_verifier` RFC 7636 allows.
 */
const VERIFIER_BYTES = 32;

export const CODE_CHALLENGE_METHOD = "S256";

export interface PkcePair {
	codeVerifier: string;
	codeChallenge: string;
}

/**
 * Creates a PKCE pair for a single login attempt. The verifier is only
 * ever sent when exchanging the authorization code for tokens, so it
 * must be kept in memory until then and discarded afterwards.
 */
export default function createPkcePair(): PkcePair {
	const codeVerifier = randomBytes(VERIFIER_BYTES).toString("base64url");

	const codeChallenge = createHash("sha256")
		.update(codeVerifier)
		.digest("base64url");

	return { codeVerifier, codeChallenge };
}
