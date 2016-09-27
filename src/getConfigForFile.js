/* @flow */
import type {
  stylelint$api,
  stylelint$configAugmented,
} from "./flow-declarations"
import { configurationError } from "./utils"

export default function (
  stylelint: stylelint$api,
  searchPath?: string,
): Promise<{
  config: stylelint$configAugmented,
  configDir: string
}> {
  searchPath = searchPath || process.cwd()

  if (stylelint._options.config) {
    const cached = stylelint._configCache.get(stylelint._options.config)
    if (cached !== undefined) { return cached }
    // stylelint._explorer (cosmiconfig) is already configured to
    // run augmentConfig; but since we're making up the result here,
    // we need to manually run the transform
    const augmentedResult = stylelint._augmentConfig({
      config: stylelint._options.config,
      configDir: process.cwd(),
    })
    stylelint._configCache.set(searchPath, augmentedResult)
    return augmentedResult
  }

  const cached = stylelint._configCache.get(searchPath)
  if (cached !== undefined) { return cached }

  return stylelint._explorer.load(searchPath, stylelint._options.configFile)
    .then((result) => {
      if (!result) {
        const ending = (searchPath) ? ` for ${searchPath}` : ""
        throw configurationError(`No configuration provided${ending}`)
      }
      const augmentedResult = stylelint._augmentConfig(result)
      stylelint._configCache.set(searchPath, augmentedResult)
      return augmentedResult
    })
}
