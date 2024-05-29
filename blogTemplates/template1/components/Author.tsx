import { fmobile, fresponsive, ftablet } from "library/fullyResponsive"
import type { Author as AuthorType } from "types/aliases"
import UniversalImage from "library/UniversalImage"
import styled, { css } from "styled-components"

import { projectTextStyles as textStyles } from "../blogConfig/templateText"
import { blogConfig as data } from "../blogConfig/data"

const colors = data.projectColors

export default function Author({ data }: { data: AuthorType }) {
	return (
		<Wrapper>
			<ProfilePhoto
				image={data?.headshot?.gatsbyImageData}
				alt={data?.fullName ?? ""}
			/>
			<div>{data.fullName}</div>
			<div>{data.roleAndCompany}</div>
		</Wrapper>
	)
}

const Wrapper = styled.div`
  ${textStyles.bodyXS};
  color: ${colors.neutral800};
  display: flex;
  align-items: center;

  ${fresponsive(css`
    gap: 8px;
  `)}

  ${ftablet(css`
    ${textStyles.bodyS};
    gap: 3px;
  `)}
  
  ${fmobile(css`
    ${textStyles.bodyS};
    gap: 3px;
  `)}
`
const ProfilePhoto = styled(UniversalImage)`
  ${fresponsive(css`
    width: 36px;
    height: 36px;
    border-radius: 99vw;
    isolation: isolate;
    overflow: clip;
  `)}

  ${ftablet(css`
    width: 48px;
    height: 48px;
  `)}

  ${fmobile(css`
    width: 48px;
    height: 48px;
  `)}
`

const Info = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`
