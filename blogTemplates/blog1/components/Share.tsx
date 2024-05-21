import Social from "./Buttons/Social"
import { isBrowser } from "library/deviceDetection"

const getCurrentURL = () => {
	if (isBrowser) {
		return window.location.href
	}
	return ""
}

export default function Share({ title }: { title: string | undefined | null }) {
	return (
		title && (
			<>
				<Social
					icon="linkedin"
					to={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
						getCurrentURL(),
					)}&title=${title}`}
					// Best place to pull company name?
					companyName="Our company"
				/>
				<Social
					icon="x"
					to={`https://www.twitter.com/share?url=${getCurrentURL()}&text=${title}`}
					companyName="Our company"
				/>
			</>
		)
	)
}
