/* @flow */
import {
  augmentConfigExtended,
  augmentConfigFull,
} from "./augmentConfig"
import {
  stylelint$internalApi,
  stylelint$options,
} from "./flow-declarations"
import _ from "lodash"
import cosmiconfig from "cosmiconfig"
import createStylelintResult from "./createStylelintResult"
import getConfigForFile from "./getConfigForFile"
import getPostcssResult from "./getPostcssResult"
import isPathIgnored from "./isPathIgnored"
import lintSource from "./lintSource"

export default function (
  options: stylelint$options = {},
): stylelint$internalApi {
  const stylelint: Object = { _options: options }

  // Two separate explorers so they can each have their own transform
  // function whose results are cached by cosmiconfig
  stylelint._fullExplorer = cosmiconfig("stylelint", {
    argv: false,
    rcExtensions: true,
    transform: _.partial(augmentConfigFull, stylelint),
  })
  stylelint._extendExplorer = cosmiconfig(null, {
    argv: false,
    transform: _.partial(augmentConfigExtended, stylelint),
  })

  stylelint._postcssResultCache = new Map()
  stylelint._createStylelintResult = _.partial(createStylelintResult, stylelint)
  stylelint._getPostcssResult = _.partial(getPostcssResult, stylelint)

  stylelint.getConfigForFile = _.partial(getConfigForFile, stylelint)
  stylelint.isPathIgnored = _.partial(isPathIgnored, stylelint)
  stylelint.lintSource = _.partial(lintSource, stylelint)

  return stylelint
}
