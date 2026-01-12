import {
	createContext,
	type PropsWithChildren,
	useContext,
	useMemo,
} from "react";
import { type DawStore, makeDawStore } from "../daw/store";
import { NoopPlatform, type Platform } from "../ports/Platform";

export interface AppServices {
	store: DawStore;
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
	const store = useMemo(() => makeDawStore(), []);

	return (
		<AppServicesContext.Provider value={{ store, platform }}>
			{props.children}
		</AppServicesContext.Provider>
	);
}
