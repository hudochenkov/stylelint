/* @flow */
import ignore from "ignore"
import multimatch from "multimatch"
import path from "path"
import type { stylelint$api } from "./flow-declarations"

export default function (
  stylelint: stylelint$api,
  filePathArg?: string,
): Promise<boolean> {
  // ??? to please Flow
  const filePath = filePathArg
  if (!filePath) { return Promise.resolve(false) }

  return stylelint.getConfigForFile(filePath).then(({ config }) => {
    const absoluteFilePath = (path.isAbsolute(filePath))
      ? filePath
      : path.resolve(process.cwd(), filePath)

    if (config.ignoreFiles && multimatch(absoluteFilePath, config.ignoreFiles).length) {
      return true
    }

    const ignorePatternsFilter = ignore().add(config.ignorePatterns).createFilter()

    const filepathRelativeToCwd = path.relative(process.cwd(), filePath)

    if (ignorePatternsFilter && !ignorePatternsFilter(filepathRelativeToCwd)) {
      return true
    }

    return false
  })
}
