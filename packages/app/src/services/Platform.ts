import { Context, Layer } from "effect";
import type { Platform } from "../ports/Platform";

export class PlatformService extends Context.Tag("daw/Platform")<
	PlatformService,
	Platform
>() {}

export const PlatformLayer = (platform: Platform) =>
	Layer.succeed(PlatformService, platform);
