import { useEffect, useState } from "react";

export function useGlobalKeyPressed(key: string): boolean {
	const [isPressed, setIsPressed] = useState(false);
	useEffect(() => {
		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === key) {
				setIsPressed(false);
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === key) {
				setIsPressed(true);
			}
		};

		window.addEventListener("keyup", handleKeyUp);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keyup", handleKeyUp);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [key]);
	return isPressed;
}
