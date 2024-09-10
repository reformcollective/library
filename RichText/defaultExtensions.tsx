import UniversalLink from "library/Loader/UniversalLink"
import UniversalImage from "library/UniversalImage"
import { fresponsive } from "library/fullyResponsive"
import styled, { css } from "styled-components"
import { z } from "zod"

const DefaultImage = styled(UniversalImage)`
	width: 100%;
	height: auto;
	display: block;

	${fresponsive(css`
		border-radius: 15px;
	`)}

	img {
		width: 100%;
		height: auto;
	}
`

const FileDownload = styled.a`
	text-decoration: underline;
`

const Frame = styled.iframe`
	object-fit: cover;
	object-position: center;
	border: none;
	width: 100%;
	aspect-ratio: 16 / 9;
	${fresponsive(css`
		border-radius: 8px;
	`)}
`

/* this is not meant to be pretty, you should override it with your own extension */
const Sample = styled.div`
	border: 1px solid green;
	border-radius: 20px;
	padding: 40px;
`

export const defaultExtensions = [
	/**
	 * images
	 */
	(d: unknown) => {
		const { success: isValidImage, data } = z
			.object({
				gatsbyImageData: z.any().refine((x) => x && "images" in x),
				description: z.string().nullish(),
			})
			.safeParse(d)

		if (isValidImage)
			return (
				<DefaultImage
					image={data.gatsbyImageData}
					alt={data.description ?? ""}
				/>
			)
	},
	/**
	 * file uploads
	 */
	(d: unknown) => {
		const { success: isValidFile, data } = z
			.object({
				file: z.object({
					url: z.string(),
					fileName: z.string(),
				}),
			})
			.safeParse(d)

		if (isValidFile)
			return (
				<FileDownload href={data.file.url}>
					Download {data.file.fileName}
				</FileDownload>
			)
	},
	/**
	 * Call To Action
	 */
	(d: unknown) => {
		const { success: isValidCTA, data } = z
			.object({
				title: z.string(),
				paragraphText: z.object({ paragraphText: z.string() }),
			})
			.safeParse(d)

		if (isValidCTA)
			return (
				<Sample>
					<h1>{data.title}</h1>
					<p>{data.paragraphText.paragraphText}</p>
					<UniversalLink to="/">click me to do the thing!</UniversalLink>
				</Sample>
			)
	},
	/**
	 * quote
	 */
	(d: unknown) => {
		const { success: isValidQuote, data } = z
			.object({
				quotation: z.object({ quotation: z.string() }),
				attribution: z.string().nullish(),
			})
			.safeParse(d)

		if (isValidQuote)
			return (
				<Sample>
					<p>{data.quotation.quotation}</p>
					{data.attribution && <p>{data.attribution}</p>}
				</Sample>
			)
	},
	/**
	 * youtube embed
	 */
	(d: unknown) => {
		const { success: isValidYoutube, data } = z
			.object({
				title: z.string().nullish(),
				youtubeLink: z.string(),
			})
			.safeParse(d)

		if (isValidYoutube) {
			const regex = /^https:\/\/youtu\.be\/(\w+)/
			const videoId = regex.exec(data.youtubeLink)?.[1]
			if (!videoId) return "Invalid YouTube Embed"

			return (
				<Frame
					loading="lazy"
					width="100%"
					height="100%"
					src={`https://www.youtube.com/embed/${videoId}`}
					title={data.title ?? ""}
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture;"
					allowFullScreen={true}
				/>
			)
		}
	},
]
