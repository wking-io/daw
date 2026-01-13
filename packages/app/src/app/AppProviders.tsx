import { RegistryProvider } from "@effect-atom/atom-react";
import { createContext, type PropsWithChildren, useContext } from "react";
import { NoopPlatform, type Platform } from "../ports/Platform";

export interface AppServices {
	platform: Platform;
}

const AppServicesContext = createContext<AppServices | null>(null);

export function useAppServices(): AppServices {
	const ctx = useContext(AppServicesContext);
	if (!ctx) throw new Error("AppServicesContext not found");
	return ctx;
}

export function AppProviders(
	props: PropsWithChildren<{
		platform?: Platform;
	}>,
) {
	const platform = props.platform ?? NoopPlatform;

	return (
		<RegistryProvider>
			<AppServicesContext.Provider value={{ platform }}>
				{props.children}
			</AppServicesContext.Provider>
		</RegistryProvider>
	);
}
