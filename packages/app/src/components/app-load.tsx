import { AsciiLoader, type AsciiLoaderType } from "./ascii-loader";

export function AppLoad() {
	return (props: { message: string; loaderType: AsciiLoaderType }) => {
		console.log("loaderType AppLoad", props.loaderType);
		return (
			<div class="flex flex-col items-center justify-center h-full gap-4">
				<AsciiLoader
					setup={{ loader: props.loaderType }}
					loader={props.loaderType}
				/>
				<p>{props.message}</p>
			</div>
		);
	};
}
