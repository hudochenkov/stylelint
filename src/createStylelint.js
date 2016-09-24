/* @flow */
import {
  stylelint$api,
  stylelint$options,
} from "./flow-declarations"
import _ from "lodash"
import cosmiconfig from "cosmiconfig"
import createStylelintResult from "./createStylelintResult"
import getConfigForFile from "./getConfigForFile"
import getPostcssResult from "./getPostcssResult"
import isPathIgnored from "./isPathIgnored"
import lint from "./lint"

const cosmiconfigOptions = {
  // Turn off argv option to avoid hijacking the all-too-common
  // `--config` argument when stylelint is used in conjunction with other CLI's
  // (e.g. webpack)
  argv: false,
  // Allow extensions on rc filenames
  rcExtensions: true,
}

export default function (
  options: stylelint$options = {},
): stylelint$api {
  const stylelint: Object = { _options: options }

  stylelint._explorer = cosmiconfig("stylelint", cosmiconfigOptions)
  stylelint._configCache = new Map()
  stylelint._postcssResultCache = new Map()

  stylelint._createStylelintResult = _.partial(createStylelintResult, stylelint)
  stylelint._getPostcssResult = _.partial(getPostcssResult, stylelint)

  stylelint.getConfigForFile = _.partial(getConfigForFile, stylelint)
  stylelint.isPathIgnored = _.partial(isPathIgnored, stylelint)
  stylelint.lint = _.partial(lint, stylelint)

  return stylelint
}
