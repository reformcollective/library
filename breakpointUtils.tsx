import styled from "styled-components"
import media from "styles/media"

export const DesktopOnly = styled.div`
	${media.tablet} {
		display: none;
	}
	${media.mobile} {
		display: none;
	}
`

export const TabletOnly = styled.div`
	display: none;
	${media.tablet} {
		display: block;
	}
`

export const MobileOnly = styled.div`
	display: none;
	${media.mobile} {
		display: block;
	}
`

export const DesktopTabletOnly = styled.div`
	${media.mobile} {
		display: none;
	}
`

export const TabletMobileOnly = styled.div`
	${media.fullWidth} {
		display: none;
	}
	${media.desktop} {
		display: none;
	}
`
