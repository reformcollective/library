import { createElement, Fragment } from "react"
import type {
	BaseSchemaDefinition,
	CustomValidatorResult,
	FieldMember,
	ObjectInputProps,
	ObjectSchemaType,
	PreviewConfig,
	ReferenceFilterOptions,
} from "sanity"
import {
	defineField,
	definePlugin,
	defineType,
	ObjectInputMember,
} from "sanity"
import type { CustomLinkType } from "sanity-plugin-link-field"

import { fileDownloadLinkType, smsLinkType } from "./resolve"

type LinkFieldPluginOptions = {
	linkableSchemaTypes?: string[]
	referenceFilterOptions?: ReferenceFilterOptions
	weakReferences?: boolean
	descriptions?: {
		internal?: string
		external?: string
		email?: string
		phone?: string
		sms?: string
		file?: string
		text?: string
		blank?: string
		advanced?: string
		parameters?: string
		anchor?: string
	}
	enableLinkParameters?: boolean
	enableAnchorLinks?: boolean
	customLinkTypes?: CustomLinkType[]
	icon?: BaseSchemaDefinition["icon"]
	preview?: PreviewConfig
}

type LinkFieldDescriptions = NonNullable<LinkFieldPluginOptions["descriptions"]>

type LinkValue = {
	type?: string
	internalLink?: unknown
	url?: string
	email?: string
	phone?: string
	sms?: string
	value?: string
	file?: { asset?: unknown }
}

type LinkSchemaType = Omit<ObjectSchemaType, "options"> & {
	options?: {
		enableText?: boolean
		textLabel?: string
	}
}

function LinkInput(props: ObjectInputProps<LinkValue, LinkSchemaType>) {
	const [textField, ...otherFields] = props.members as FieldMember[]
	const members = props.schemaType.options?.enableText
		? props.members
		: otherFields
	const renderProps = {
		renderAnnotation: props.renderAnnotation,
		renderBlock: props.renderBlock,
		renderField: props.renderField,
		renderInlineBlock: props.renderInlineBlock,
		renderInput: props.renderInput,
		renderItem: props.renderItem,
		renderPreview: props.renderPreview,
	}

	return createElement(
		Fragment,
		null,
		members.map((member) =>
			createElement(ObjectInputMember, {
				key: member.key,
				member:
					member === textField && props.schemaType.options?.textLabel
						? {
								...member,
								field: {
									...textField.field,
									schemaType: {
										...textField.field.schemaType,
										title: props.schemaType.options.textLabel,
									},
								},
							}
						: member,
				...renderProps,
			}),
		),
	)
}

const defaultDescriptions = {
	internal: "Link to another page or document on the website.",
	external: "Link to an absolute URL to a page on another website.",
	email: "Link to send an e-mail to the given address.",
	phone: "Link to call the given phone number.",
	sms: "Link to send an SMS message to the given phone number.",
	file: "Upload a file for visitors to download.",
	text: undefined,
	blank: undefined,
	advanced: "Optional. Add anchor links and custom parameters.",
	parameters: "Optional. Add custom parameters to the URL, such as UTM tags.",
	anchor: "Optional. Add an anchor to link to a specific section on the page.",
} satisfies LinkFieldDescriptions

function isCustomLinkType(
	type: string | undefined,
	customLinkTypes: CustomLinkType[],
) {
	return customLinkTypes.some((customLinkType) => customLinkType.value === type)
}

function getCustomLinkOptions(customLinkTypes: CustomLinkType[]) {
	return customLinkTypes.flatMap((type) => {
		if (!Array.isArray(type.options)) return []
		return type.options.map((option) => ({
			title: option.title,
			value: option.value,
		}))
	})
}

function isValidPhoneNumber(value: string) {
	return (
		/^\+?[0-9\s-]*$/.test(value) &&
		!value.startsWith("-") &&
		!value.endsWith("-")
	)
}

export const requiredLinkField = (field?: LinkValue): CustomValidatorResult => {
	if (!field?.type) return "Link is required"

	if (field.type === "internal" && !field.internalLink)
		return { message: "Link is required", path: "internalLink" }

	if (field.type === "external" && !field.url)
		return { message: "URL is required", path: "url" }

	if (field.type === "email" && !field.email)
		return { message: "E-mail is required", path: "email" }

	if (field.type === "phone" && !field.phone)
		return { message: "Phone is required", path: "phone" }

	if (field.type === smsLinkType && !field.sms)
		return { message: "SMS number is required", path: "sms" }

	if (field.type === fileDownloadLinkType && !field.file?.asset)
		return { message: "File is required", path: "file" }

	if (
		![
			"internal",
			"external",
			"email",
			"phone",
			smsLinkType,
			fileDownloadLinkType,
		].includes(field.type) &&
		!field.value
	)
		return { message: "Value is required", path: "value" }

	return true
}

export const linkField = definePlugin<LinkFieldPluginOptions | undefined>(
	(opts) => {
		const {
			linkableSchemaTypes = ["page"],
			weakReferences = false,
			referenceFilterOptions,
			descriptions: descriptionOverrides,
			enableLinkParameters = true,
			enableAnchorLinks = true,
			customLinkTypes = [],
			icon,
			preview,
		} = opts || {}
		const descriptions = { ...defaultDescriptions, ...descriptionOverrides }

		const linkTypes = [
			...(linkableSchemaTypes.length > 0
				? [{ title: "Internal", value: "internal" }]
				: []),
			{ title: "URL", value: "external" },
			{ title: "Email", value: "email" },
			{ title: "Phone", value: "phone" },
			{ title: "SMS", value: smsLinkType },
			...customLinkTypes.map(({ title, value }) => ({ title, value })),
			{ title: "File Download", value: fileDownloadLinkType },
		]

		const customLinkOptions = getCustomLinkOptions(customLinkTypes)

		const linkType = defineType({
			name: "link",
			title: "Link",
			type: "object",
			icon,
			preview,
			fieldsets: [
				{
					name: "advanced",
					title: "Advanced",
					description: descriptions.advanced,
					options: {
						collapsible: true,
						collapsed: true,
					},
				},
			],
			fields: [
				defineField({
					name: "text",
					type: "string",
					description: descriptions.text,
				}),
				defineField({
					name: "type",
					type: "string",
					initialValue: "internal",
					validation: (rule) => rule.required(),
					options: { list: linkTypes },
				}),
				defineField({
					name: "internalLink",
					type: "reference",
					to: linkableSchemaTypes.map((type) => ({ type })),
					weak: weakReferences,
					options: {
						disableNew: true,
						...referenceFilterOptions,
					},
					description: descriptions.internal,
					hidden: ({ parent }) => !!parent?.type && parent.type !== "internal",
				}),
				defineField({
					name: "url",
					type: "url",
					description: descriptions.external,
					validation: (rule) =>
						rule.uri({
							allowRelative: true,
							scheme: ["https", "http"],
						}),
					hidden: ({ parent }) => parent?.type !== "external",
				}),
				defineField({
					name: "email",
					type: "email",
					description: descriptions.email,
					hidden: ({ parent }) => parent?.type !== "email",
				}),
				defineField({
					name: "phone",
					type: "string",
					description: descriptions.phone,
					validation: (rule) =>
						rule.custom((value, context) => {
							if (
								!value ||
								(context.parent as LinkValue | undefined)?.type !== "phone"
							)
								return true
							return isValidPhoneNumber(value) || "Must be a valid phone number"
						}),
					hidden: ({ parent }) => parent?.type !== "phone",
				}),
				defineField({
					name: "sms",
					title: "SMS Number",
					type: "string",
					description: descriptions.sms,
					validation: (rule) =>
						rule.custom((value, context) => {
							if (
								!value ||
								(context.parent as LinkValue | undefined)?.type !== smsLinkType
							)
								return true
							return isValidPhoneNumber(value) || "Must be a valid SMS number"
						}),
					hidden: ({ parent }) => parent?.type !== smsLinkType,
				}),
				defineField({
					name: "value",
					type: "string",
					description: descriptions.external,
					options: { list: customLinkOptions },
					hidden: ({ parent }) =>
						!isCustomLinkType(parent?.type, customLinkTypes),
				}),
				defineField({
					name: "file",
					title: "File",
					type: "file",
					description: descriptions.file,
					hidden: ({ parent }) => parent?.type !== fileDownloadLinkType,
				}),
				defineField({
					title: "Open in new window",
					name: "blank",
					type: "boolean",
					initialValue: false,
					description: descriptions.blank,
					hidden: ({ parent }) =>
						parent?.type === "email" ||
						parent?.type === "phone" ||
						parent?.type === smsLinkType,
				}),
				...(enableLinkParameters
					? [
							defineField({
								title: "Parameters",
								name: "parameters",
								type: "string",
								description: descriptions.parameters,
								validation: (rule) =>
									rule.custom((value, context) => {
										if (
											!value ||
											[
												"email",
												"phone",
												smsLinkType,
												fileDownloadLinkType,
											].includes(
												(context.parent as LinkValue | undefined)?.type ?? "",
											)
										)
											return true

										if (!value.startsWith("?"))
											return "Must start with ?; eg. ?utm_source=example.com&utm_medium=referral"

										if (value.length === 1)
											return "Must contain at least one parameter"

										return true
									}),
								hidden: ({ parent }) =>
									[
										"email",
										"phone",
										smsLinkType,
										fileDownloadLinkType,
									].includes(parent?.type ?? ""),
								fieldset: "advanced",
							}),
						]
					: []),
				...(enableAnchorLinks
					? [
							defineField({
								title: "Anchor",
								name: "anchor",
								type: "string",
								description: descriptions.anchor,
								validation: (rule) =>
									rule.custom((value, context) => {
										if (
											!value ||
											[
												"email",
												"phone",
												smsLinkType,
												fileDownloadLinkType,
											].includes(
												(context.parent as LinkValue | undefined)?.type ?? "",
											)
										)
											return true

										if (!value.startsWith("#"))
											return "Must start with #; eg. #page-section-1"

										if (value.length === 1)
											return "Must contain at least one character"

										return (
											/^([-?/:@._~!$&'()*+,;=a-zA-Z0-9]|%[0-9a-fA-F]{2})*$/.test(
												value.replace(/^#/, ""),
											) || "Invalid URL fragment"
										)
									}),
								hidden: ({ parent }) =>
									[
										"email",
										"phone",
										smsLinkType,
										fileDownloadLinkType,
									].includes(parent?.type ?? ""),
								fieldset: "advanced",
							}),
						]
					: []),
			],
			components: {
				input: LinkInput,
			},
		})

		return {
			name: "link-field",
			schema: {
				types: [linkType],
			},
		}
	},
)
