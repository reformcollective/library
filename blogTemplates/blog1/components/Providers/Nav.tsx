import type React from "react"
import {
	createContext,
	startTransition,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react"
import type { TemplateColors } from "../../types/template-aliases"

const NavContext = createContext<{
	menuDark: boolean
	setMenuDark: React.Dispatch<React.SetStateAction<boolean>>
	color: TemplateColors
	setColor: React.Dispatch<React.SetStateAction<TemplateColors>>
}>({
	menuDark: false,
	setMenuDark: () => false,
	color: "green",
	setColor: () => "green",
})

/**
 * access the current header color & theme
 * @param options
 * @param options.color the theme color for this page
 * @param options.menuDark whether the menu should be dark text or light text
 * @returns the current header color & theme
 */
export const useNavConfig = (options?: {
	color?: TemplateColors
	menuDark?: boolean
}) => {
	const { color, menuDark, setColor, setMenuDark } = useContext(NavContext)

	const newColor = options?.color
	const newMenuDark = options?.menuDark

	useEffect(() => {
		if (newColor) startTransition(() => setColor(newColor))
		if (typeof newMenuDark === "boolean")
			startTransition(() => setMenuDark(newMenuDark))
	}, [newColor, newMenuDark, setColor, setMenuDark])

	return { color, menuDark }
}

type Props = {
	children: React.ReactNode
}

export default function NavProvider({ children }: Props) {
	const [menuDark, setMenuDark] = useState<boolean>(false)
	const [color, setColor] = useState<TemplateColors>("green")

	const values = useMemo(
		() => ({
			menuDark,
			setMenuDark,
			color,
			setColor,
		}),
		[color, menuDark],
	)

	return <NavContext.Provider value={values}>{children}</NavContext.Provider>
}
