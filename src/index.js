import {
  report,
  ruleMessages,
  validateOptions,
} from "./utils"
import createPlugin from "./createPlugin"
import createRuleTester from "./testUtils/createRuleTester"
import postcssPlugin from "./postcssPlugin"
import rules from "./rules"
import standalone from "./standalone"

const api = postcssPlugin

api.utils = {
  report,
  ruleMessages,
  validateOptions,
}

api.lint = standalone
api.rules = rules
api.createPlugin = createPlugin
api.createRuleTester = createRuleTester

module.exports = api
