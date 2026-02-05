import { basename, join } from "node:path";

const iconDir = join(import.meta.dir, "../src/icons/icon");
const outputDir = join(import.meta.dir, "../src/icons");
const indexPath = join(outputDir, "index.ts");

const svgGlob = new Bun.Glob("*.svg");

const toPascalCase = (value: string) => {
  const parts = value.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const combined = parts
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join("");
  if (!combined) return "Icon";
  if (!/^[A-Za-z_]/.test(combined)) return `Icon${combined}`;
  return combined;
};

const normalizeSvg = (svg: string) => {
  const svgMatch = svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  const rawBody = (svgMatch?.[1] ?? svg).trim();

  return rawBody
    .replace(/\s+stroke="[^"]*"/gi, "")
    .replace(/\s+fill="[^"]*"/gi, "")
    .replace(/\s+stroke-width="[^"]*"/gi, "")
    .trim();
};

const indentSvg = (svgBody: string) => {
  const lines = svgBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line) => `        ${line}`).join("\n");
};

const buildIconFile = (iconName: string, svgBody: string) => {
  return `import { BaseIcon, type IconProps } from "./base";

export function ${iconName}Icon() {
  return (props: IconProps) => {
    return (
      <BaseIcon {...props}>
${indentSvg(svgBody)}
      </BaseIcon>
    );
  };
}
`;
};

let count = 0;
const generatedFiles: string[] = [];

for await (const svgPath of svgGlob.scan({ cwd: iconDir })) {
  const filename = basename(svgPath, ".svg");
  const iconName = toPascalCase(filename);
  const svgText = await Bun.file(join(iconDir, svgPath)).text();
  const svgBody = normalizeSvg(svgText);
  const outputPath = join(outputDir, `${filename}.tsx`);

  await Bun.write(outputPath, buildIconFile(iconName, svgBody));
  count += 1;
  generatedFiles.push(filename);
}

const exportLines = generatedFiles
  .sort((a, b) => a.localeCompare(b))
  .map((name) => `export * from "./${name}";`)
  .join("\n");

await Bun.write(indexPath, `${exportLines}\n`);

console.log(`Generated ${count} icon${count === 1 ? "" : "s"} in ${outputDir}.`);
