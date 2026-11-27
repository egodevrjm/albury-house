import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import manifest from "./live-media.json" with { type: "json" };

const live = "https://albury-house.vercel.app/";
const failures = [];
for (let offset = 0; offset < manifest.length; offset += 12) {
  await Promise.all(manifest.slice(offset, offset + 12).map(async file => {
    if (!/^(?:images|documents)\/[a-zA-Z0-9][a-zA-Z0-9./ _-]*\.(?:avif|jpe?g|png|webp|pdf|svg)$/i.test(file) || file.split("/").includes("..")) {
      failures.push(file + " (invalid path)");
      return;
    }
    try {
      const url = new URL(file.split("/").map(encodeURIComponent).join("/"), live);
      const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(12000) });
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || !/^(?:image\/|application\/pdf)/.test(type)) throw new Error("HTTP " + response.status + " " + type);
      const content = Buffer.from(await response.arrayBuffer());
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, content);
    } catch (error) {
      failures.push(file + " (" + error.message + ")");
    }
  }));
}
if (failures.length) console.warn("Media unavailable in the live deployment:\n" + failures.join("\n"));
console.log("Recovered " + (manifest.length - failures.length) + " of " + manifest.length + " deployed asset paths.");
