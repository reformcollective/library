export type TemplateColors = "red" | "green" | "blue"

export type BlogCard =
	Queries.BlogPageQuery["allContentfulPageBlogPost"]["nodes"][number]

export type BlogPost = Queries.BlogPostQuery["contentfulPageBlogPost"]
