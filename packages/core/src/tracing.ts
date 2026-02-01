import { NodeSdk } from "@effect/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { Config, Effect, Layer, Option, Redacted } from "effect";

export interface TracingConfig {
  readonly serviceName: string;
  readonly serviceVersion?: string;
  readonly enabled: boolean;
  readonly otlpEndpoint?: string;
  readonly axiomToken?: string;
  readonly axiomDataset?: string;
  readonly consoleExporter?: boolean;
}

const TracingConfigFromEnv = Config.all({
  enabled: Config.boolean("OTEL_ENABLED").pipe(Config.withDefault(false)),
  otlpEndpoint: Config.string("OTEL_EXPORTER_OTLP_ENDPOINT").pipe(Config.option),
  axiomToken: Config.redacted("AXIOM_TOKEN").pipe(Config.option),
  axiomDataset: Config.string("AXIOM_DATASET").pipe(Config.option),
  consoleExporter: Config.boolean("OTEL_CONSOLE_EXPORTER").pipe(Config.withDefault(false)),
});

export const makeTracingLayer = (
  serviceName: string,
  serviceVersion = "0.0.0",
): Layer.Layer<never> =>
  Layer.unwrapEffect(
    Effect.gen(function* () {
      const envConfig = yield* Effect.either(TracingConfigFromEnv);

      if (envConfig._tag === "Left" || !envConfig.right.enabled) {
        return Layer.empty;
      }

      const env = envConfig.right;
      const axiomToken = Option.map(env.axiomToken, Redacted.value);
      const config: TracingConfig = {
        serviceName,
        serviceVersion,
        enabled: env.enabled,
        otlpEndpoint: Option.getOrUndefined(env.otlpEndpoint),
        axiomToken: Option.getOrUndefined(axiomToken),
        axiomDataset: Option.getOrUndefined(env.axiomDataset),
        consoleExporter: env.consoleExporter,
      };

      const spanProcessors: Array<BatchSpanProcessor | SimpleSpanProcessor> = [];

      const headers: Record<string, string> = {};
      if (config.axiomToken) {
        headers.Authorization = `Bearer ${config.axiomToken}`;
      }
      if (config.axiomDataset) {
        headers["X-Axiom-Dataset"] = config.axiomDataset;
      }

      if (config.otlpEndpoint) {
        const exporter = new OTLPTraceExporter({
          url: `${config.otlpEndpoint}/v1/traces`,
          headers,
        });
        spanProcessors.push(new BatchSpanProcessor(exporter));
      } else if (config.axiomToken && config.axiomDataset) {
        const exporter = new OTLPTraceExporter({
          url: "https://api.axiom.co/v1/traces",
          headers,
        });
        spanProcessors.push(new BatchSpanProcessor(exporter));
      } else {
        const exporter = new OTLPTraceExporter({ headers });
        spanProcessors.push(new BatchSpanProcessor(exporter));
      }

      if (config.consoleExporter) {
        spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
      }

      yield* Effect.log(`Tracing enabled for ${serviceName}@${serviceVersion}`);

      return NodeSdk.layer(() => ({
        resource: {
          serviceName: config.serviceName,
          serviceVersion: config.serviceVersion,
        },
        spanProcessor: spanProcessors,
      }));
    }),
  );
