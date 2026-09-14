import {
  copyFile,
  cp,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
await mkdir("static/vendor/three", { recursive: true });
for (const file of ["three.module.js", "three.core.js"]) {
  await copyFile(
    "node_modules/three/build/" + file,
    "static/vendor/three/" + file,
  );
}
for (const folder of ["loaders", "controls", "utils"]) {
  await cp(
    "node_modules/three/examples/jsm/" + folder,
    "static/vendor/three/addons/" + folder,
    { recursive: true },
  );
}
await copyFile("node_modules/three/LICENSE", "static/vendor/three/LICENSE");
async function rewrite(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = dir + "/" + entry.name;
    if (entry.isDirectory()) await rewrite(path);
    else if (path.endsWith(".js")) {
      const source = await readFile(path, "utf8");
      await writeFile(
        path,
        source
          .replaceAll(
            "from 'three'",
            "from '/static/vendor/three/three.module.js'",
          )
          .replaceAll(
            'from "three"',
            'from "/static/vendor/three/three.module.js"',
          ),
      );
    }
  }
}
await rewrite("static/vendor/three/addons");
console.log("Three.js 0.186.0 vendored locally; no CDN needed at runtime.");
