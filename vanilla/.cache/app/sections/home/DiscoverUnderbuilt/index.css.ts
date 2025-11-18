import Tag from "components/Tag"
import nativeSmoothPin from "library/nativeSmoothPin"
import { css, f, styled } from "library/styled/alpha"
import colors from "styles/colors"
import textStyles from "styles/text"
export const OuterWrapper = styled("section", [
	f.responsive(css`
		grid-column: fullbleed;
		background: ${colors.clay100};
	`),
], "OuterWrapper");
export const InnerWrapper = styled("div", [
	f.responsive(css`
		grid-column: main;
		display: grid;
		grid-template:
			"topcontent" auto
			"topimage" 600px
			"scrolledcontent" auto
			"spacer" calc(80vh - calc(50vh - 300px));
		grid-template-columns: var(--subgrid-columns);
		background: ${colors.clay100};
	`),
	f.small(css`
		grid-template:
			"mobile-hero" auto
			"mobile-intro" auto
			"mobile-carousel" auto
			"mobile-pagination" auto / var(--subgrid-columns) !important;
		background: #70534b;
		border-radius: 24px;
		overflow: clip;
		row-gap: 0;
	`),
], "InnerWrapper");
export const TitleText = styled("div", [
	f.responsive(css`
		${textStyles.h3}
		grid-row: topcontent;
		grid-column: main;
		color: ${colors.black};
		text-align: center;
		padding: 120px 0 52px;
	`),
	f.small(css`
		display: block;
		grid-area: mobile-hero;
		place-self: end stretch;
		grid-column: main;
		position: static;
		z-index: 2;
		color: ${colors.white};
		text-align: center;
		padding: 172px 20px 70px;
		${textStyles.h5}
		letter-spacing: -0.05em;
	`),
], "TitleText");
export const TopCard = styled("div", [
	f.responsive(css`
		grid-row: topimage;
		grid-column: main;
		text-align: center;
		z-index: 1;
		height: 600px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		position: sticky;
		top: calc(50vh - 300px);
		${nativeSmoothPin({ top: "calc(50vh - 300px)" })}
	`),
	f.small(css`
		grid-area: mobile-intro;
		grid-column: main;
		height: auto;
		justify-content: flex-start;
		align-items: flex-start;
		padding: 0;
		gap: 12px;
		text-align: left;
		position: static;
		top: auto;
	`),
], "TopCard");
export const TopCardIntro = styled("p", [
	f.responsive(css`
		${textStyles.h5}
		color: ${colors.white};
	`),
	f.small(css`
		${textStyles.kicker1}
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: ${colors.clay400};
		margin: 0;
		display: block;
		text-align: left;
		width: 100%;
	`),
], "TopCardIntro");
export const TopCardTitleWrapper = styled("div", [
	f.responsive(css`
		display: flex;
		align-items: start;
		justify-content: center;
		margin-top: 26px;
		margin-bottom: 38px;
	`),
	f.small(css`
		margin: 0;
		width: 100%;
		display: flex;
		align-items: flex-start;
		justify-content: flex-start;
		gap: 6px;
	`),
], "TopCardTitleWrapper");
export const TopCardTitle = styled("p", [
	f.responsive(css`
		${textStyles.h3}
		color: ${colors.white};
	`),
	f.small(css`
		${textStyles.h5}
		letter-spacing: -0.05em;
		margin: 0;
		display: block;
		text-align: left;
	`),
], "TopCardTitle");
export const TopCardTM = styled("p", [
	f.responsive(css`
		${textStyles.kicker1}
		color: ${colors.white};
		padding: 11px;
	`),
	f.small(css`
		padding: 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		align-self: flex-start;
		padding-top: 6px;
	`),
], "TopCardTM");
export const TopCardSubtitle = styled("p", [
	f.responsive(css`
		${textStyles.kicker1}
		color: ${colors.clay100};
	`),
	f.small(css`
		display: none;
	`),
], "TopCardSubtitle");
export const BackgroundImageSpace = styled("div", [
	f.responsive(css`
		grid-row: topimage / scrolledcontent;
		grid-column: column-1-end / column-12-start;
		height: 600px;
		position: sticky;
		top: calc(50vh - 300px);
		margin-bottom: calc(50vh - 300px);
		display: flex;
		justify-content: center;
		opacity: 0.8;
		background: ${colors.clay900};
		border-radius: 24px;
		align-items: center;
		${nativeSmoothPin({ top: "calc(50vh - 300px)" })}
	`),
	f.small(css`
		grid-row: mobile-hero;
		grid-column: fullbleed;
		display: grid;
		place-items: stretch;
		background: none;
		width: 100%;
		height: 319px;
		margin: 0;
		position: relative;
		z-index: 1;
		top: 0;
	`),
], "BackgroundImageSpace");
export const BackgroundImageWrapper = styled("div", [
	f.responsive(css`
		overflow: clip;
		border-radius: 24px;
		width: 100%;
		height: 100%;
		position: relative;
		flex-shrink: 0;
		background: ${colors.black400};
		opacity: 1;
	`),
	f.small(css`
		border-radius: 0;
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		background: none;
		mask-image: linear-gradient(
			to bottom,
			red calc(100% - 144px),
			transparent 100%
		);
	`),
], "BackgroundImageWrapper");
export const ScrolledBackgroundImage___raw = styled("div", [
	f.responsive(css`
		height: calc(100vh + 100px);
		width: calc(100vw + 100px);
		max-width: unset;
		max-height: unset;
		position: absolute;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
		opacity: 0.8;
		will-change: filter, opacity, transform;
	`),
	f.small(css`
		position: static;
		height: 100%;
		width: 100%;
		translate: 0 0;
		justify-self: center;
		display: block;
		object-fit: cover;
		opacity: 0;
	`),
], "ScrolledBackgroundImage");
export const ScrolledContentWrapper = styled("div", [
	f.responsive(css`
		grid-area: scrolledcontent;
		grid-column: fullbleed;
		display: grid;
		grid-template-columns: subgrid;
		padding: 120px 0;
		z-index: 1;
		margin-top: 30lvh;
	`),
	f.large(css`
		position: sticky;
		top: 0;
		height: 100vh;
		${nativeSmoothPin({ goopType: "end", top: "0.1px" })}
	`),
	f.small(css`
		display: grid;
		grid-template-columns: subgrid;
		grid-area: mobile-intro / fullbleed;
		padding: 80px 0 0;
		margin-top: unset;
	`),
], "ScrolledContentWrapper");
export const ScrolledTextWrapper = styled("div", [
	f.responsive(css`
		grid-column: main;
		display: grid;
		grid-template-columns: subgrid;
		gap: 16px;
		transform: translateY(50vh);
		opacity: 0;
	`),
	f.small(css`
		display: none;
	`),
], "ScrolledTextWrapper");
export const TagWrapper = styled("div", [
	f.responsive(css`
		grid-column: main;
		display: flex;
		gap: 14px;
		align-items: center;
	`),
], "TagWrapper");
export const StyledTag___raw = styled("div", [
	f.responsive(css`
		background: ${colors.clay600};
		color: ${colors.clay900};
	`),
], "StyledTag");
export const TextContent = styled("div", [
	f.responsive(css`
		grid-column: main;
		display: grid;
		grid-template-columns: subgrid;
		gap: 72px;
		color: ${colors.white};
	`),
], "TextContent");
export const ScrolledTitle = styled("h2", [
	f.responsive(css`
		${textStyles.h5}
		color: ${colors.white};
		grid-column: main / column-4;
		width: 370px;
		margin: 0;
	`),

	f.small(css`
		grid-column: main / column-3;
		width: 370px;
		margin: 0;
	`),
], "ScrolledTitle");
export const ScrolledBody = styled("p", [
	f.responsive(css`
		${textStyles.bodyM}
		color: ${colors.white};
		grid-column: column-5 / column-8;
		margin: 0;
	`),

	f.small(css`
		grid-column: column-5 / column-7;
		margin: 0;
	`),
], "ScrolledBody");
export const CarouselWrapper = styled("div", [
	f.responsive(css`
		grid-column: fullbleed;
		display: grid;
		grid-template-columns: subgrid;
		margin-top: 24px;
		z-index: -1;
		opacity: 0;
		transform: translateY(50vh);
	`),
	f.small(css`
		grid-area: mobile-carousel;
		grid-column: fullbleed;
		margin-top: 0;
		opacity: 1;
		transform: translateY(0);
	`),
], "CarouselWrapper");
export const CarouselViewport = styled("div", [
	f.responsive(css`
		grid-column: fullbleed;
		display: flex;
		overflow-x: auto;
		padding: 100px 24px 100px calc(calc(100vw - 1440px) / 2 + 24px);
		scroll-snap-type: x proximity;
		-webkit-overflow-scrolling: touch;
		/* stylelint-disable-next-line plugin/no-unsupported-browser-features */
		scrollbar-width: none;
		margin: -100px 0;

		&::-webkit-scrollbar {
			display: none;
		}
	`),
	f.small(css`
		grid-column: fullbleed;
		padding: 0 calc(calc(100vw - 375px) / 2 + 10px) 5px;
		margin: 0;
		gap: 8px;
		scroll-snap-type: x mandatory;
	`),
], "CarouselViewport");
export const CarouselItem = styled("div", [
	f.responsive(css`
		display: flex;
		flex-direction: column;
		gap: 16px;
		flex: 0 0 auto;
		scroll-snap-align: start;
		scroll-margin-left: calc(calc(100vw - 1440px) / 2 + 24px);
		margin-right: 24px;
	`),
	f.small(css`
		scroll-margin-left: calc(calc(100vw - 375px) / 2 + 10px);
		width: 345px;
		gap: 16px;
	`),
], "CarouselItem");
export const DesktopCarouselImage___raw = styled("div", [
	f.responsive(css`
		height: 504px;
		width: auto;
		object-fit: cover;
		border-radius: 24px;
	`),
	f.small(css`
		display: none;
	`),
], "DesktopCarouselImage");
export const MobileCarouselImage___raw = styled("div", [
	f.responsive(css`
		display: none;
	`),
	f.small(css`
		display: block;
		height: 460px;
		width: 345px;
		object-fit: cover;
		border-radius: 16px;
		flex-shrink: 0;
	`),
], "MobileCarouselImage");
export const CarouselText = styled("p", [
	f.responsive(css`
		${textStyles.link1}
		color: ${colors.white};
		margin: 0;
		overflow-wrap: anywhere;
		max-width: 400px;
	`),
	f.small(css`
		${textStyles.link1}
		color: ${colors.white};
		margin: 0;
		width: 345px;
		text-align: left;
		letter-spacing: -0.05em;
	`),
], "CarouselText");
export const CarouselButtons = styled("div", [
	f.responsive(css`
		/* place inside the TextContent subgrid row, at the right side */
		grid-column: column-9 / main;
		place-self: end end;
		display: flex;
		gap: 12px;
		align-items: center;
	`),
	f.small(css`
		display: none;
	`),
], "CarouselButtons");
export const CarouselButton = styled("button", [
	f.responsive(css`
		width: 36px;
		height: 36px;
		border-radius: 9999px;
		background: ${colors.black};
		border: none;
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: ${colors.clay300};
		transition: opacity 0.3s ease;

		&[disabled] {
			opacity: 0.2;
			cursor: default;
		}
	`),
], "CarouselButton");
export const PaginationWrapper = styled("div", [
	f.responsive(css`
		display: none;
	`),
	f.small(css`
		display: flex;
		grid-area: mobile-pagination / fullbleed;
		justify-content: center;
		align-items: center;
		gap: 8px;
		padding: 40px 0;
	`),
], "PaginationWrapper");
export const PaginationDot = styled("div", {
	variants: {
		$active: {
			true: [
				f.small(css`
					width: 24px;
					height: 4px;
					border-radius: 16px;
					background: ${colors.clay900};
					transition:
						width 0.3s ease,
						opacity 0.3s ease;
				`),
			],
			false: [
				f.small(css`
					width: 8px;
					height: 4px;
					border-radius: 16px;
					background: ${colors.clay900};
					opacity: 0.3;
					transition:
						width 0.3s ease,
						opacity 0.3s ease;
				`),
			],
		},
	},
}, "PaginationDot");
export const RightArrowIcon___raw = styled("div", [
	f.responsive(css`
		width: 20px;
		height: 20px;
	`),
], "RightArrowIcon");
export const LeftArrowIcon___raw = styled("div", [
	f.responsive(css`
		transform: scaleX(-1);
	`),
], "LeftArrowIcon");
