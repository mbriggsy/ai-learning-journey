// Loaded with `node --import` by workflows.test.mjs: registers redirect-hooks.mjs with the map in
// ULTRAMODE_REDIRECT (JSON: each real module's file URL to the URL of the copy to load in its
// place), so a module's own test file runs against the copy a generated Workflow script inlined.
import { register } from "node:module";

register("./redirect-hooks.mjs", import.meta.url, { data: JSON.parse(process.env.ULTRAMODE_REDIRECT ?? "{}") });
