import UniversalLink from "library/Loader/UniversalLink"
import styled from "styled-components"

interface Props {
  data: {
    url: string
    newTab: boolean
    displayText: string
  }
}

export default function RichLink({ data }: Props) {
  return (
    <StyledLink to={data.url} openInNewTab={data.newTab}>
      {data.displayText}
    </StyledLink>
  )
}

const StyledLink = styled(UniversalLink)`
  text-decoration: underline;
`
