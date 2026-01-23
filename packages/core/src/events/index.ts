import { Schema } from "effect";
import * as Editor from "./editor";
import { ServerEvent } from "./server";

export * from "./editor";
export * from "./event-batch";

export const Events = Schema.Union(ServerEvent, Editor.EditorEventBatch);
export type Events = Schema.Schema.Type<typeof Events>;
