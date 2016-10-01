/* @flow */
import {
  stylelint$internalApi,
  stylelint$options,
} from "./flow-declarations"
import _ from "lodash"
import augmentConfig from "./augmentConfig"
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

  stylelint._explorer = cosmiconfig("stylelint", {
    argv: false,
    rcExtensions: true,
  })
  stylelint._configCache = new Map()
  stylelint._postcssResultCache = new Map()

  stylelint._augmentConfig = _.partial(augmentConfig, stylelint)
  stylelint._createStylelintResult = _.partial(createStylelintResult, stylelint)
  stylelint._getPostcssResult = _.partial(getPostcssResult, stylelint)

  stylelint.getConfigForFile = _.partial(getConfigForFile, stylelint)
  stylelint.isPathIgnored = _.partial(isPathIgnored, stylelint)
  stylelint.lintSource = _.partial(lintSource, stylelint)

  return stylelint
}
