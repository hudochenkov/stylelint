/* @flow */
import type {
  stylelint$config,
  stylelint$configAugmented,
  stylelint$configProcessors,
  stylelint$internalApi,
} from "./flow-declarations"
import _ from "lodash"
import { configurationError } from "./utils"
import fs from "fs"
import globjoin from "globjoin"
import normalizeRuleSettings from "./normalizeRuleSettings"
import path from "path"
import resolveFrom from "resolve-from"
import rules from "./rules"

const DEFAULT_IGNORE_FILENAME = ".stylelintignore"
const FILE_NOT_FOUND_ERROR_CODE = "ENOENT"

function augmentConfigBasic(
  stylelint: Object,
  config: stylelint$config,
  configDir: string,
): Promise<stylelint$config> {
  return Promise.resolve()
    .then(() => {
      return absolutizePaths(config, configDir)
    })
    .then((augmentedConfig) => {
      return extendConfig(stylelint, augmentedConfig, configDir)
    })
}

function augmentConfigExtended(
  stylelint: Object,
  cosmiconfigResult: {
    config: stylelint$config,
    filepath: string,
  },
): Promise<stylelint$config> {
  const configDir = path.dirname(cosmiconfigResult.filepath || "")
  const cleanedConfig = _.omit(cosmiconfigResult.config, "ignoreFiles")
  return augmentConfigBasic(stylelint, cleanedConfig, configDir)
}

function augmentConfigFull(
  stylelint: stylelint$internalApi,
  cosmiconfigResult: ?{
    config: stylelint$config,
    filepath: string,
  },
): Promise<stylelint$configAugmented> {
  if (!cosmiconfigResult) return Promise.resolve(null)

  const { config, filepath } = cosmiconfigResult

  const configDir = stylelint._options.configBasedir
    || path.dirname(filepath || "")

  return addIgnorePatterns(stylelint, config, configDir)
    .then((augmentedConfig) => {
      return augmentConfigBasic(stylelint, augmentedConfig, configDir)
    })
    .then((augmentedConfig) => {
      return addPluginFunctions(augmentedConfig)
    })
    .then((augmentedConfig) => {
      return addProcessorFunctions(augmentedConfig)
    })
    .then((augmentedConfig) => {
      const configWithOverrides = _.merge(augmentedConfig, stylelint._options.configOverrides)

      if (!configWithOverrides.rules) {
        throw configurationError("No rules found within configuration. Have you provided a \"rules\" property?")
      }

      return configWithOverrides
    })
    .then((augmentedConfig) => {
      return normalizeAllRuleSettings(augmentedConfig)
    })
    .then((augmentedConfig) => {
      return {
        config: augmentedConfig,
        configDir,
      }
    })
}

function addIgnorePatterns(
  stylelint: stylelint$internalApi,
  config: stylelint$config,
): Promise<stylelint$config> {
  const ignoreFilePath = stylelint._options.ignorePath || DEFAULT_IGNORE_FILENAME
  const absoluteIgnoreFilePath = (path.isAbsolute(ignoreFilePath))
    ? ignoreFilePath
    : path.resolve(process.cwd(), ignoreFilePath)

  return new Promise((resolve, reject) => {
    fs.readFile(absoluteIgnoreFilePath, "utf8", (err, data) => {
      if (err) {
        // If the file's not found, fine, we'll just
        // consider it an empty array of globs
        if (err.code === FILE_NOT_FOUND_ERROR_CODE) { return resolve(config) }
        return reject(err)
      }
      // Add an ignorePatterns property to the config, containing the
      // .gitignore-patterned globs loaded from .stylelintignore
      config.ignorePatterns = data
      resolve(config)
    })
  })
}

function absolutizePaths(
  config: stylelint$config,
  configDir: string,
): stylelint$config {
  if (config.ignoreFiles) {
    config.ignoreFiles = [].concat(config.ignoreFiles).map((glob) => {
      if (path.isAbsolute(glob.replace(/^!/, ""))) return glob
      return globjoin(configDir, glob)
    })
  }

  if (config.plugins) {
    config.plugins = [].concat(config.plugins).map(lookup => {
      return getModulePath(configDir, lookup)
    })
  }

  if (config.processors) {
    config.processors = absolutizeProcessors(config.processors, configDir)
  }

  return config
}

function getModulePath(
  basedir: string,
  lookup: string,
): string {
  let path = resolveFrom(basedir, lookup)
  if (!path) {
    path = resolveFrom(process.cwd(), lookup)
  }
  if (!path) {
    throw configurationError(
      `Could not find "${lookup}". Do you need a \`configBasedir\`?`
    )
  }
  return path
}

function absolutizeProcessors(
  processors: stylelint$configProcessors,
  configDir: string,
): stylelint$configProcessors {
  return [].concat(processors).map((item) => {
    if (typeof item === "string") {
      return getModulePath(configDir, item)
    }

    return [
      getModulePath(configDir, item[0]),
      item[1],
    ]
  })
}

function extendConfig(
  stylelint: Object,
  config: stylelint$config,
  configDir: stylelint$config,
): Promise<stylelint$config> {
  if (!config.extends) return Promise.resolve(config)

  const originalWithoutExtends = _.omit(config, "extends")

  const loadExtends = [].concat(config.extends).reduce((resultPromise, extendLookup) => {
    return resultPromise.then((resultConfig) => {
      return loadExtendedConfig(stylelint, resultConfig, configDir, extendLookup).then((extendedConfig) => {
        return mergeConfigs(resultConfig, extendedConfig)
      })
    })
  }, Promise.resolve(originalWithoutExtends))

  return loadExtends.then((resultConfig) => {
    return mergeConfigs(resultConfig, originalWithoutExtends)
  })
}

function loadExtendedConfig(
  stylelint: Object,
  config: stylelint$config,
  configDir: string,
  extendLookup: string,
): Promise<stylelint$config> {
  const extendPath = getModulePath(configDir, extendLookup)
  return stylelint._extendExplorer.load(null, extendPath)
}

function mergeConfigs(
  a: stylelint$config,
  b: stylelint$config,
): stylelint$config {
  const pluginMerger = {}
  if (a.plugins || b.plugins) {
    pluginMerger.plugins = _.union(a.plugins, b.plugins)
  }
  const rulesMerger = {}
  if (a.rules || b.rules) {
    rulesMerger.rules = Object.assign({}, a.rules, b.rules)
  }
  return Object.assign({}, b, a, pluginMerger, rulesMerger)
}

function addPluginFunctions(
  config: stylelint$configAugmented,
): stylelint$configAugmented {
  if (!config.plugins) return config

  const pluginFunctions = config.plugins.reduce((result, pluginLookup) => {
    let pluginImport = require(pluginLookup)
    // Handle either ES6 or CommonJS modules
    pluginImport = pluginImport.default || pluginImport

    ;[].concat(pluginImport).forEach((plugin) => {
      if (!plugin.ruleName) {
        throw configurationError(
          "stylelint v3+ requires plugins to expose a ruleName. " +
          `The plugin "${pluginLookup}" is not doing this, so will not work ` +
          "with stylelint v3+. Please file an issue with the plugin."
        )
      }

      if (!_.includes(plugin.ruleName, "/")) {
        throw configurationError(
          "stylelint v7+ requires plugin rules to be namspaced, " +
          "i.e. only `plugin-namespace/plugin-rule-name` plugin rule names are supported. " +
          `The plugin rule "${plugin.ruleName}" does not do this, so will not work. ` +
          "Please file an issue with the plugin."
        )
      }

      result[plugin.ruleName] = plugin.rule
    })

    return result
  }, {})

  config.pluginFunctions = pluginFunctions
  return config
}

function normalizeAllRuleSettings(
  config: stylelint$configAugmented,
): stylelint$configAugmented {
  const normalizedRules = {}
  Object.keys(config.rules).forEach((ruleName) => {
    const rawRuleSettings = config.rules[ruleName]
    const rule = rules[ruleName] || _.get(config, [ "pluginFunctions", ruleName ])
    if (!rule) {
      throw configurationError(`Undefined rule ${ruleName}`)
    }
    normalizedRules[ruleName] = normalizeRuleSettings(rawRuleSettings, ruleName, _.get(rule, "primaryOptionArray"))
  })
  config.rules = normalizedRules
  return config
}

const processorCache = new Map()

function addProcessorFunctions(
  config: stylelint$configAugmented
): stylelint$configAugmented {
  if (!config.processors) return config

  const codeProcessors = []
  const resultProcessors = []

  ;[].concat(config.processors).forEach((processorConfig) => {
    const processorKey = JSON.stringify(processorConfig)

    let initializedProcessor
    if (processorCache.has(processorKey)) {
      initializedProcessor = processorCache.get(processorKey)
    } else {
      processorConfig = [].concat(processorConfig)
      const processorLookup = processorConfig[0]
      const processorOptions = processorConfig[1]
      let processor = require(processorLookup)
      processor = processor.default || processor
      initializedProcessor = processor(processorOptions)
      processorCache.set(processorKey, initializedProcessor)
    }

    if (initializedProcessor && initializedProcessor.code) {
      codeProcessors.push(initializedProcessor.code)
    }
    if (initializedProcessor && initializedProcessor.result) {
      resultProcessors.push(initializedProcessor.result)
    }
  })

  config.codeProcessors = codeProcessors
  config.resultProcessors = resultProcessors
  return config
}

export {
  augmentConfigExtended,
  augmentConfigFull,
}
