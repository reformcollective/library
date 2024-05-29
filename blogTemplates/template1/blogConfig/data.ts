import { ReactComponent as PlaceholderSVG } from "library/blogTemplates/template1/images/icons/placeholder.svg"
import placeholder from "library/blogTemplates/template1/images/placeholder.webp"

// This file contains a mock of the data that would be returned from Contentful.
// Once the queries have been setup, the data can be removed.
// In addition to dummy data, this file also serves as the "source of truth" for the blog's colors, textStyles, and gradients.
// Any changes to the colors, textStyles, and gradients should be made here.

const placeholderGatsbyImageData = {
	height: 100,
	width: 100,
	layout: "constrained",
	placeholder: {
		fallback: placeholder,
	},
	images: {
		fallback: {
			sizes: "(max-width: 100px) 100vw, 100px",
			src: placeholder,
			srcSet: placeholder,
		},
		sources: [
			{
				sizes: "(max-width: 100px) 100vw, 100px",
				srcSet: placeholder,
				type: "image/webp",
			},
		],
	},
}

export const blogConfig = {
	// TODO: Remove after queries are setup
	allContentfulPageBlogPost: {
		nodes: [
			{
				slug: "test-2",
				id: "id-1",
				author: {
					id: "author-id-1",
					headshot: {
						gatsbyImageData: placeholderGatsbyImageData,
						createdAt: "2022-01-01T00:00:00Z",
					},
					fullName: "John Doe",
					roleAndCompany: "Financial Analyst at FTX",
				},
				title: "Tax Fraud: A How-To Guide",
				mainImage: {
					gatsbyImageData: placeholderGatsbyImageData,
					description: "A picture of some money",
				},
				categories: ["Category 1", "Category 2"],
				articleTextPreview: "First things first, income tax is illegal.",
			},
		],
	},
	// TODO: Remove after queries are setup
	contentfulPageBlogHub: {
		id: "blog-hub-1",
		featuredBlogPost: {
			slug: "article-2",
			id: "id-2",
			author: {
				id: "author-id-2",
				headshot: {
					gatsbyImageData: placeholderGatsbyImageData,
					createdAt: "2022-01-01T00:00:00Z",
				},
				fullName: "Jane Doe",
				roleAndCompany: "Director of Sustainability at Exxon Mobil",
			},
			title: "The Wonders of Napalm",
			mainImage: {
				gatsbyImageData: placeholderGatsbyImageData,
				description: "A bright, glowing fireball",
			},
			categories: ["Category 3", "Category 4"],
			articleTextPreview: "Napalm is a great way to clear out a forest.",
		},
	},
	// TODO: Remove after queries are setup
	categories: {
		allContentfulPageBlogPost: {
			items: ["Category 1", "Category 2", "Category 3", "Category 4"],
		},
	},
	// TODO: Remove after queries are setup
	contentfulPageBlogPost: {
		title: "Tax Fraud: A How-To Guide",
		slug: "test-2",
		articleTextPreview: "First things first, income tax is illegal.",
		author: {
			id: "author-id-1",
			headshot: {
				gatsbyImageData: placeholderGatsbyImageData,
				createdAt: "2022-01-01T00:00:00Z",
			},
			fullName: "John Doe",
			roleAndCompany: "Financial Analyst at FTX",
		},
		mainImage: {
			file: {
				url: placeholder,
			},
			gatsbyImageData: placeholderGatsbyImageData,
			description: "A picture of some money",
		},
		categories: ["Category 1", "Category 2"],
		articleText: {
			raw: `{"data":{}}`,
		},
	},
	// TODO: Remove after queries are setup
	threeContentfulPageBlogPost: {
		nodes: [
			{
				slug: "blog-post-slug",
				id: "blog-post-id",
				createdAt: "January 1, 2022",
				author: {
					id: "author-id",
					headshot: {
						gatsbyImageData: placeholderGatsbyImageData,
						createdAt: "2022-01-01T00:00:00Z",
					},
					fullName: "Author Full Name",
					roleAndCompany: "Author Role and Company",
				},
				title: "Blog Post Title",
				mainImage: {
					gatsbyImageData: placeholderGatsbyImageData,
					description: "Main image description",
				},
				categories: ["Category 1", "Category 2"],
				articleTextPreview: "This is a preview of the article text...",
			},
			{
				slug: "blog-post-slug-2",
				id: "blog-post-id-2",
				createdAt: "January 1, 2022",
				author: {
					id: "author-id",
					headshot: {
						gatsbyImageData: placeholderGatsbyImageData,
						createdAt: "2022-01-01T00:00:00Z",
					},
					fullName: "Author Full Name",
					roleAndCompany: "Author Role and Company",
				},
				title: "Blog Post Title",
				mainImage: {
					gatsbyImageData: placeholderGatsbyImageData,
					description: "Main image description",
				},
				categories: ["Category 1", "Category 2"],
				articleTextPreview: "This is a preview of the article text...",
			},
		],
	},
	projectColors: {
		neutralBlack: "#1B1F1C",
		neutral900: "#424242",
		neutral800: "#5C5C5C",
		neutral700: "#959393",
		neutral600: "#AEADAD",
		neutral500: "#C7C7C7",
		neutral400: "#E0E0E0",
		neutral300: "#EBEBEB",
		neutral200: "#F2F2F2",
		neutral100: "#FAFAFA",
		neutralWhite: "#FFFFFF",

		primary700: "#1A7A0C",
		primary600: "#2CA90A",
		primary500: "#32CB08",
		primary400: "#37EB05",
		primary300: "#72FA4C",
		primary200: "#A8FC92",
		primary100: "#D0FDC4",
	},
	projectGradients: {
		primarySecondary: "linear-gradient(39deg, #37EB05 4.74%, #55D2FF 94.17%)",
	},
	// TODO: Fill in
	projectTextStyles: {},
	emailSubmitIcon: PlaceholderSVG,
	emailSuccessIcon: PlaceholderSVG,
	categoriesIcon: PlaceholderSVG,
	emailMessage: "Get our stories right to your inbox.",
	emailSuccessMessage: "Thanks for subscribing!",
	emailInputPlaceholder: "Your Email",
	searchInputPlaceholder: "Search the blog...",
	hubHeaderTitle: "Lorem ipsum dolor",
	hubHeaderSubtitle: "Consectetur adipiscing elit",
	hubHeaderDescription:
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
	hubHeaderImage: placeholder,
}
