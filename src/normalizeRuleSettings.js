/* @flow */
import {
  stylelint$configRulePrimaryOption,
  stylelint$configRuleSettings,
} from "./flow-declarations"
import _ from "lodash"

export default function (
  rawSettings: stylelint$configRuleSettings,
  ruleName: string,
  primaryOptionArray?: boolean,
): Array<stylelint$configRulePrimaryOption | [stylelint$configRulePrimaryOption, Object]> {
  // Settings can be
  // a. A solitary primitive value or object, in which case put it in an array
  // b. An array with a primary option and a secondary options object, in which case use that array
  // c. A solitary array ... in which case we have trouble and need to special-case it
  //    ... hence the list above

  if (!Array.isArray(rawSettings)) { return [rawSettings] }
  // Everything below is an array ...

  if (!primaryOptionArray) { return rawSettings }
  // Everything below is a rule that CAN have an array for a primary option ...
  // (they might also have something else, e.g. rule-properties-order can
  // have the string "alphabetical")

  if (
    rawSettings.length === 2
    && !_.isPlainObject(rawSettings[0])
    && _.isPlainObject(rawSettings[1])
  ) { return rawSettings }

  return [rawSettings]
}
