/* @flow */
import ignore from "ignore"
import multimatch from "multimatch"
import path from "path"
import type { stylelint$internalApi } from "./flow-declarations"

export default function (
  stylelint: stylelint$internalApi,
  filePathArg?: string,
): Promise<boolean> {
  const filePath = filePathArg // to please Flow
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
