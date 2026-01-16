import { cn } from "@app/utils/cn";
import type {
	HTMLAttributes,
	LabelHTMLAttributes,
	PropsWithChildren,
} from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

export function Controls({
	children,
	className,
}: PropsWithChildren<{ className?: string }>) {
	return (
		<div className={cn("absolute right-0 bottom-0 z-10 w-full", className)}>
			<div className="flex items-center justify-end px-4 pb-4">{children}</div>
		</div>
	);
}

export function RefreshButton(props: HTMLAttributes<HTMLButtonElement>) {
	return (
		<button {...props} className="p-3">
			<svg
				width="16"
				height="16"
				viewBox="0 0 16 16"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				aria-label="Refresh"
			>
				<title>Refresh</title>
				<path
					fillRule="evenodd"
					clipRule="evenodd"
					d="M7 0H8V1H7V0ZM8 4H9V3H10V2H9V1H8V2H7H6V3H5H4V4H3V5V6H2V7V8V9V10H3V11V12H4V11V10H3V9V8V7V6H4V5V4H5H6V3H7H8V4ZM8 4V5H7V4H8ZM12 4H13V5V6H12V5V4ZM13 10V9V8V7V6H14V7V8V9V10H13ZM12 12V11V10H13V11V12H12ZM10 13V12H11H12V13H11H10ZM8 15V14H9H10V13H9H8V12H9V11H8V12H7V13H6V14H7V15H8ZM8 15V16H9V15H8Z"
					fill="currentColor"
				/>
			</svg>
			<span className="sr-only">Refresh</span>
		</button>
	);
}

const SettingsContext = createContext<{
	open: boolean;
	toggle: () => void;
}>({
	open: false,
	toggle: () => {},
});

function useSettings() {
	const context = useContext(SettingsContext);
	if (!context) {
		throw new Error("useSettings must be used within a SettingsProvider");
	}
	return context;
}

function Root({ children }: PropsWithChildren) {
	const [open, setOpen] = useState(false);

	const toggle = useCallback(() => {
		setOpen((prev) => !prev);
	}, []);

	return (
		<SettingsContext.Provider value={{ open, toggle }}>
			{children}
		</SettingsContext.Provider>
	);
}

function Trigger(props: HTMLAttributes<HTMLButtonElement>) {
	const { open, toggle } = useSettings();

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "m") {
				toggle();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [toggle]);

	return (
		<button {...props} className="p-3" onClick={toggle}>
			<span className="flex size-4 items-center justify-center">
				{open ? (
					<svg
						width="14"
						height="13"
						viewBox="0 0 14 13"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<title>Close settings</title>
						<path
							fillRule="evenodd"
							clipRule="evenodd"
							d="M1 0H0V1H1V2H2V3H3V4H4V5H5V6H6V7H5V8H4V9H3V10H2V11H1V12H0V13H1H2V12H3V11H4V10H5V9H6V8H7H8V9H9V10H10V11H11V12H12V13H13H14V12H13V11H12V10H11V9H10V8H9V7H8V6H9V5H10V4H11V3H12V2H13V1H14V0H13H12V1H11V2H10V3H9V4H8V5H7H6V4H5V3H4V2H3V1H2V0H1Z"
							fill="currentColor"
						/>
					</svg>
				) : (
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<title>Open settings</title>
						<path
							fillRule="evenodd"
							clipRule="evenodd"
							d="M3 1H2V2H1V3V4V5V6V7V8V9V10V11V12V13V14H2V15H3H4H5H6H7H8H9H10H11H12H13H14H15V14V13V12V11V10V9V8V7V6V5V4V3H14H13H12H11H10H9H8H7V4H8H9H10H11H12H13H14V5V6V7V8V9V10V11V12V13V14H13H12H11H10H9H8H7H6H5H4H3V13H2V12V11H3V10H4H5V11H6V10V9V8V7V6V5V4V3V2H5V1H4H3ZM7 5H8V6V7H9V6V5H10V6V7V8V9H11V8V7H12V6H13V7V8H12V9H13V10H12H11H10V11V12V13H9V12H8V13H7V12V11H8H9V10H8H7V9V8V7V6V5ZM12 6H11V5H12V6ZM9 9H8V8H9V9ZM11 11H12H13V12V13H12V12H11V11ZM5 12H6V13H5V12Z"
							fill="currentColor"
						/>
					</svg>
				)}
			</span>
			<span className="sr-only">Settings</span>
		</button>
	);
}

function Panel({ children }: PropsWithChildren) {
	const { open } = useSettings();

	if (!open) return null;

	return (
		<div className="border-foreground/10 absolute right-4 bottom-full mb-2 border-1 bg-white/10 p-4 backdrop-blur-sm">
			<div className="corner corner-tl" />
			<div className="corner corner-tr" />
			<div className="corner corner-bl" />
			<div className="corner corner-br" />
			<div className="space-y-4">{children}</div>
		</div>
	);
}

function Field({
	row = false,
	...props
}: PropsWithChildren<{ row?: boolean }>) {
	return (
		<div
			{...props}
			className={cn(
				"flex gap-0.5",
				row ? "items-center justify-between" : "flex-col",
			)}
		/>
	);
}

function Header(props: HTMLAttributes<HTMLDivElement>) {
	return <div {...props} className="group flex items-center justify-between" />;
}

function Actions(props: HTMLAttributes<HTMLDivElement>) {
	return <div {...props} className="flex items-center gap-1" />;
}

function Label({ htmlFor, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
	return (
		<label
			htmlFor={htmlFor}
			aria-label={props["aria-label"]}
			{...props}
			className="font-code block text-xs font-extralight"
		/>
	);
}

const Settings = {
	Root,
	Trigger,
	Panel,
	Field,
	Header,
	Actions,
	Label,
};

export default Settings;
