"use client"

import { css, f, styled } from "library/styled"
import { AudioTrackMenu } from "./AudioTrackMenu"
import { CaptionsButton } from "./CaptionsButton"
import { Captions } from "./Captions"
import { CastButton } from "./CastButton"
import { ChaptersMenu } from "./ChaptersMenu"
import { Controls, type ControlsProps } from "./Controls"
import { CurrentTime } from "./CurrentTime"
import { Duration } from "./Duration"
import { FullscreenButton } from "./FullscreenButton"
import { MuteButton } from "./MuteButton"
import { PiPButton } from "./PiPButton"
import { PlaybackRateButton } from "./PlaybackRateButton"
import { PlayButton } from "./PlayButton"
import { QualityMenu } from "./QualityMenu"
import { Scrubber } from "./Scrubber"
import { VolumeSlider } from "./VolumeSlider"

export type DefaultControlsProps = Omit<ControlsProps, "children">

export function DefaultControls(props: DefaultControlsProps) {
	return (
		<Controls {...props}>
			<Captions />
			<Bar>
				<PlayButton />
				<MuteButton />
				<VolumeSlider />
				<CurrentTime />
				<Progress />
				<Duration />
				<CaptionsButton />
				<PlaybackRateButton />
				<QualityMenu />
				<AudioTrackMenu />
				<ChaptersMenu />
				<PiPButton />
				<CastButton />
				<FullscreenButton />
			</Bar>
		</Controls>
	)
}

const Bar = styled(
	"div",
	f.unresponsive(css`
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	`),
)

const Progress = styled(
	Scrubber,
	f.unresponsive(css`
		flex: 1 1 120px;
		min-width: 0;
	`),
)
