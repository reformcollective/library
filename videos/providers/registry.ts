import { CAPABILITIES } from "library/videos/capabilities"
import type {
	ProviderAdapterFactory,
	ProviderDefinition,
	ResolvedSource,
	VideoProvider,
} from "library/videos/types"
import { parseVideoUrl } from "./parse"

const definitions = new Map<string, ProviderDefinition>()

function matchProvider(provider: VideoProvider) {
	return (input: string) => {
		const parsed = parseVideoUrl(input)
		if (parsed && parsed.provider === provider) return parsed
		return null
	}
}

async function loadFactory(
	module: Promise<{ factory: ProviderAdapterFactory }>,
) {
	return (await module).factory
}

const BUILT_IN: ProviderDefinition[] = [
	{
		id: "mux",
		match: () => null,
		load: () => loadFactory(import("./mux")),
		capabilities: CAPABILITIES.mux,
	},
	{
		id: "file",
		match: matchProvider("file"),
		load: () => loadFactory(import("./file")),
		capabilities: CAPABILITIES.file,
	},
	{
		id: "youtube",
		match: matchProvider("youtube"),
		load: () => loadFactory(import("./youtube")),
		capabilities: CAPABILITIES.youtube,
	},
	{
		id: "vimeo",
		match: matchProvider("vimeo"),
		load: () => loadFactory(import("./vimeo")),
		capabilities: CAPABILITIES.vimeo,
	},
	{
		id: "wistia",
		match: matchProvider("wistia"),
		load: () => loadFactory(import("./wistia")),
		capabilities: CAPABILITIES.wistia,
	},
	{
		id: "twitch",
		match: matchProvider("twitch"),
		load: () => loadFactory(import("./twitch")),
		capabilities: CAPABILITIES.twitch,
	},
	{
		id: "tiktok",
		match: matchProvider("tiktok"),
		load: () => loadFactory(import("./tiktok")),
		capabilities: CAPABILITIES.tiktok,
	},
	{
		id: "spotify",
		match: matchProvider("spotify"),
		load: () => loadFactory(import("./spotify")),
		capabilities: CAPABILITIES.spotify,
	},
	{
		id: "cloudflare",
		match: matchProvider("cloudflare"),
		load: () => loadFactory(import("./cloudflare")),
		capabilities: CAPABILITIES.cloudflare,
	},
]

const HLS_DEFINITION: ProviderDefinition = {
	id: "file",
	match: matchProvider("file"),
	load: () => loadFactory(import("./hls")),
	capabilities: CAPABILITIES.file,
}

for (const definition of BUILT_IN) definitions.set(definition.id, definition)

/** Adds or replaces a provider definition. A future oEmbed provider is one more call. */
export function registerProvider(def: ProviderDefinition): void {
	definitions.set(def.id, def)
}

/** Returns the definition for a resolved source. HLS file sources load hls-video-element, native files load nothing extra. */
export function resolveProvider(source: ResolvedSource): ProviderDefinition {
	if (source.provider === "file" && source.format === "hls") return HLS_DEFINITION
	const definition = definitions.get(source.provider)
	if (!definition) throw new Error(`No video provider registered for ${source.provider}`)
	return definition
}
