// Os dois plugins oficiais do markdown-it nao publicam tipos.
declare module "markdown-it-ins" {
  import type { PluginSimple } from "markdown-it";
  const ins: PluginSimple;
  export default ins;
}

declare module "markdown-it-mark" {
  import type { PluginSimple } from "markdown-it";
  const mark: PluginSimple;
  export default mark;
}
