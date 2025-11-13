import { reset } from "./layers.css"
import { css } from "library/styled/alpha"

const style = css`
	/* stylelint-disable */
	@layer ${reset} {
		/***
	The new CSS reset - version 1.11.3 (last updated 25.08.2024)
	GitHub page: https://github.com/elad2412/the-new-css-reset
	***/

		/*
	Remove all the styles of the "User-Agent-Stylesheet", except for the 'display' property
	- The "symbol *" part is to solve Firefox SVG sprite bug
	- The "html" element is excluded, otherwise a bug in Chrome breaks the CSS hyphens property (https://github.com/elad2412/the-new-css-reset/issues/36)
	*/

		:where(abbr),
		:where(address),
		:where(area),
		:where(article),
		:where(aside),
		:where(audio),
		:where(b),
		:where(base),
		:where(bdi),
		:where(bdo),
		:where(big),
		:where(blockquote),
		:where(body),
		:where(br),
		:where(caption),
		:where(cite),
		:where(code),
		:where(col),
		:where(colgroup),
		:where(data),
		:where(datalist),
		:where(dd),
		:where(del),
		:where(details),
		:where(dfn),
		:where(dialog),
		:where(dl),
		:where(dt),
		:where(em),
		:where(embed),
		:where(fieldset),
		:where(figcaption),
		:where(figure),
		:where(footer),
		:where(form),
		:where(h1),
		:where(h2),
		:where(h3),
		:where(h4),
		:where(h5),
		:where(h6),
		:where(head),
		:where(header),
		:where(hgroup),
		:where(hr),
		:where(i),
		:where(input),
		:where(ins),
		:where(kbd),
		:where(keygen),
		:where(label),
		:where(legend),
		:where(li),
		:where(link),
		:where(main),
		:where(map),
		:where(mark),
		:where(menu),
		:where(menuitem),
		:where(meta),
		:where(meter),
		:where(nav),
		:where(object),
		:where(ol),
		:where(optgroup),
		:where(option),
		:where(output),
		:where(param),
		:where(picture),
		:where(pre),
		:where(progress),
		:where(q),
		:where(rp),
		:where(rt),
		:where(ruby),
		:where(s),
		:where(samp),
		:where(slot),
		:where(script),
		:where(section),
		:where(select),
		:where(small),
		:where(source),
		:where(strong),
		:where(style),
		:where(sub),
		:where(summary),
		:where(sup),
		:where(table),
		:where(template),
		:where(tbody),
		:where(td),
		:where(textarea),
		:where(tfoot),
		:where(th),
		:where(thead),
		:where(time),
		:where(title),
		:where(tr),
		:where(track),
		:where(u),
		:where(ul),
		:where(var),
		:where(wbr),
		:where(div),
		:where(span),
		:where(button),
		:where(a),
		:where(p) {
			all: unset;
			display: revert;
		}

		/* Preferred box-sizing value */
		*,
		*::before,
		*::after {
			box-sizing: border-box;
		}

		/* Fix mobile Safari increase font-size on landscape mode */
		html {
			-moz-text-size-adjust: none;
			-webkit-text-size-adjust: none;
			text-size-adjust: none;
		}

		/* Reapply the pointer cursor for anchor tags */
		a,
		button {
			cursor: revert;
		}

		/* Remove list styles (bullets/numbers) */
		ol,
		ul,
		menu,
		summary {
			list-style: none;
		}

		/* Firefox: solve issue where nested ordered lists continue numbering from parent (https://bugzilla.mozilla.org/show_bug.cgi?id=1881517) */
		ol {
			counter-reset: revert;
		}

		/* For images to not be able to exceed their container */
		img {
			max-inline-size: 100%;
			max-block-size: 100%;
		}

		/* removes spacing between cells in tables */
		table {
			border-collapse: collapse;
		}

		/* Safari - solving issue when using user-select:none on the <body> text input doesn't working */
		input,
		textarea {
			-webkit-user-select: auto;
		}

		/* revert the 'white-space' property for textarea elements on Safari */
		textarea {
			white-space: revert;
		}

		/* minimum style to allow to style meter element */
		meter {
			-webkit-appearance: revert;
			appearance: revert;
		}

		/* preformatted text - use only for this feature */
		:where(pre) {
			all: revert;
			box-sizing: border-box;
		}

		/* reset default text opacity of input placeholder */
		::placeholder {
			color: unset;
		}

		/* fix the feature of 'hidden' attribute.
display:revert; revert to element instead of attribute */
		:where([hidden]) {
			display: none;
		}

		/* revert for bug in Chromium browsers
- fix for the content editable attribute will work properly.
- webkit-user-select: auto; added for Safari in case of using user-select:none on wrapper element*/
		:where([contenteditable]:not([contenteditable="false"])) {
			-moz-user-modify: read-write;
			-webkit-user-modify: read-write;
			overflow-wrap: break-word;
			-webkit-line-break: after-white-space;
			-webkit-user-select: auto;
		}

		/* apply back the draggable feature - exist only in Chromium and Safari */
		:where([draggable="true"]) {
			-webkit-user-drag: element;
		}

		/* Revert Modal native behavior */
		:where(dialog:modal) {
			all: revert;
			box-sizing: border-box;
		}

		/* Remove details summary webkit styles */
		::-webkit-details-marker {
			display: none;
		}
	}
	/* stylelint-enable */

	/* reform specific stuff */

	/* hide scrollbars */
	html {
		font-family: sans-serif;
		scrollbar-width: none;

		body::-webkit-scrollbar {
			display: none;
		}
	}

	/* need this so that fonts match figma */
	* {
		text-rendering: geometricprecision;
		-webkit-font-smoothing: antialiased;
	}

	/**
* this is a workaround for lvh being calculated incorrectly
* - on iOS safari
* - AND only in the webview
* - AND only before the page has resized (sometimes)
*
* this will only be visible if lvh is calculated incorrectly
* safari is such a good browser with no problems
*/
	@supports not (cursor: cell) {
		body::before {
			content: "";
			pointer-events: none;
			position: fixed;
			top: 100lvh;
			left: 0;
			width: 100vw;
			height: 100lvh;
			background: red;
			z-index: 999;
		}
	}
`

export const ResetStyles = () => <style>{style}</style>
