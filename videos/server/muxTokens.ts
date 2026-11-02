import { createSign } from "node:crypto"
import type { MuxTokens } from "library/videos/types"

export type MuxTokenAudience = "v" | "t" | "g" | "s" | "d"

export interface MuxSigningKey {
	/** Mux signing key ID (kid). */
	keyId: string
	/** RSA private key, either PEM text or the base64 of that PEM as Mux shows it. */
	privateKey: string
}

export interface SignMuxTokenOptions extends MuxSigningKey {
	playbackId: string
	audience: MuxTokenAudience
	/** Lifetime in seconds. Default 3600. */
	expiresIn?: number
	/** Extra claims such as `time`, `width`, `height`, `fit_mode` for thumbnails. */
	params?: Record<string, string | number | boolean>
}

function base64Url(input: Buffer | string) {
	return Buffer.from(input).toString("base64url")
}

function toPem(privateKey: string) {
	const trimmed = privateKey.trim()
	if (trimmed.startsWith("-----BEGIN")) return trimmed
	return Buffer.from(trimmed, "base64").toString("utf8")
}

/**
 * Signs a Mux playback JWT (RS256). Run on the server only; the key never ships to the client.
 */
export function signMuxToken(options: SignMuxTokenOptions) {
	const expiresIn = options.expiresIn ?? 3600
	const header = { alg: "RS256", typ: "JWT", kid: options.keyId }
	const claims = {
		...options.params,
		sub: options.playbackId,
		aud: options.audience,
		exp: Math.floor(Date.now() / 1000) + expiresIn,
		kid: options.keyId,
	}
	const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`
	const signature = createSign("RSA-SHA256")
		.update(unsigned)
		.sign(toPem(options.privateKey))
	return `${unsigned}.${base64Url(signature)}`
}

/**
 * Signs the playback, thumbnail and storyboard tokens for one signed playback ID.
 */
export function signMuxTokens(
	options: Omit<SignMuxTokenOptions, "audience" | "params"> & {
		thumbnailParams?: SignMuxTokenOptions["params"]
	},
): MuxTokens {
	const { thumbnailParams, ...base } = options
	return {
		playback: signMuxToken({ ...base, audience: "v" }),
		thumbnail: signMuxToken({
			...base,
			audience: "t",
			params: thumbnailParams,
		}),
		storyboard: signMuxToken({ ...base, audience: "s" }),
	}
}
