import esbuild from "esbuild";
esbuild.buildSync({
  nodePaths: ["../node_modules"],
  platform: "node",
  entryPoints: ["src-local-backend/main.ts"],
  bundle: true,
  external: ["fsevents", "net", "electron"],
  outfile: "main.js",
});
