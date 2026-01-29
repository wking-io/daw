import { AsciiLoader } from "./ascii-loader";

export function AppLoad() {
	return (props: { message: string }) => {
		return (
			<div class="flex flex-col items-center justify-center h-full gap-4 -mt-4">
				<AsciiLoader
					setup={{ loader: "squareCorners" }}
					loader="squareCorners"
				/>
				<p>{props.message}</p>
			</div>
		);
	};
}
