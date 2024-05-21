import * as Form from "@radix-ui/react-form"
import { ReactComponent as CrossSVG } from "images/blog/formError.svg"
import { ReactComponent as SuccessSVG } from "images/blog/formSubmit.svg"
import { ReactComponent as ArrowSVG } from "images/global/buttonArrow.svg"
import { ReactComponent as CampfireSVG } from "images/global/icon.svg"
import UniversalLink from "library/Loader/UniversalLink"
import { fmobile, fresponsive } from "library/fullyResponsive"
import { useState } from "react"
import styled, { css } from "styled-components"
import colors from "../styles/template-colors"
import textStyles, { trim } from "../styles/template-text"

// Replace with project specific information?
const portalId = "39878266"
const formId = "74fa07ef-2b55-4f2c-afc2-3204a29cffcc"
const endpoint = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`

const sendEmail = async (email: string) => {
	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			fields: [
				{
					name: "email",
					value: email,
				},
			],
		}),
	})

	if (!response.ok) {
		throw new Error("Submission failed")
	}
}

export default function EmailInput() {
	const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
		"idle",
	)

	return (
		<Wrapper
			data-portal-id={portalId}
			data-form-id={formId}
			onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
				e.preventDefault()

				const formData = new FormData(e.currentTarget)
				const email = formData.get("email")

				if (typeof email === "string") {
					setState("loading")
					sendEmail(email)
						.then(() => {
							return setState("success")
						})
						.catch((error) => {
							setState("error")
							console.error(error)
						})
				}
			}}
		>
			<Logo />
			<Title>
				{state === "success"
					? "Thanks for subscribing to the circle!"
					: "Get Campfire Stories right to your inbox."}
			</Title>
			<Row>
				<Field name="email">
					<Input placeholder="Your Email" type="email" required />
					<Message match="valueMissing">Invalid Email</Message>
					<Message match="typeMismatch">Invalid Email</Message>
					{/* forbid dotless domains */}
					<Message match={(v: string) => !/@.*\./.test(v)}>
						Invalid Email
					</Message>
					<ErrorIcon />
				</Field>
				{state === "success" ? (
					<SuccessIcon />
				) : (
					<Submit ariaLabel="submit email" type="submit">
						<SubmitArrow />
					</Submit>
				)}
			</Row>
		</Wrapper>
	)
}

const Wrapper = styled(Form.Root)`
  ${fresponsive(css`
    margin-left: -20px;
    margin-right: 17px;
    display: flex;
    flex-direction: column;
    align-items: start;
    padding: 20px;
    gap: 16px;
    border-radius: 15px;
    background: ${colors.green};
  `)}
  ${fmobile(css`
    margin-left: 0;
    margin-right: 0;
    gap: 22px;
  `)}
`

const Logo = styled(CampfireSVG)`
  ${fresponsive(css`
    width: 38px;
    margin-left: 6px;
  `)}
  ${fmobile(css`
    display: none;
  `)}
`

const Title = styled.div`
  ${trim(1.2)};
  ${textStyles.titleS}
  ${fresponsive(css`
    margin-left: 6px;
    width: 163px;
  `)}
  ${fmobile(css`
    width: 213px;
    ${textStyles.titleL};
  `)}
`

const Row = styled.div`
  ${fresponsive(css`
    gap: 16px;
    display: flex;
    align-items: start;
    width: 100%;
  `)}
`

const ErrorIcon = styled(CrossSVG)`
  ${fresponsive(css`
    width: 16px;
    height: 16px;
    position: absolute;
    top: 16px;
    right: 16px;
    display: none;
  `)}
`

const Field = styled(Form.Field)`
  position: relative;

  &[data-invalid] {
    ${ErrorIcon} {
      display: block;
    }
  }

  ${fmobile(css`
    width: 100%;
  `)}
`

const Input = styled(Form.Control)`
  ${trim(1.2)};
  ${textStyles.titleS}

  ${fresponsive(css`
    height: 48px;
    padding: 16px;
    border-radius: 10px;
    background: ${colors.green};
    width: 100%;
    color: ${colors.green};
  `)}

  &::placeholder {
    color: ${colors.green};
  }

  &:focus {
    outline: none;

    &::placeholder {
      color: ${colors.green};
    }
  }

  &[data-invalid] {
    outline: 1px solid #f76161;
  }

  &[data-valid] {
    color: ${colors.green};
  }
`

const Message = styled(Form.Message)`
  color: #f76161;
  ${textStyles.bodyXS}
  ${fresponsive(css`
    margin-left: 16px;
    margin-top: 6px;
  `)}
`

const SuccessIcon = styled(SuccessSVG)`
  ${fresponsive(css`
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    margin-top: 6px;
  `)}
`

const Submit = styled(UniversalLink)`
  ${fresponsive(css`
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: ${colors.red};
    flex-shrink: 0;
    margin-top: 6px;
  `)}
`

const SubmitArrow = styled(ArrowSVG)`
  ${fresponsive(css`
    width: 16px;
    height: 16px;
  `)}
`
