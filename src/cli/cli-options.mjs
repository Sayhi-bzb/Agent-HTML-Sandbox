export function parseOptions(commandArgs, definition) {
  const options = {}
  const optionDefinitions = new Map(
    definition.options.map((option) => [option.name, option]),
  )

  for (let index = 0; index < commandArgs.length; index++) {
    const arg = commandArgs[index]

    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument "${arg}".`)
    }

    const key = arg.slice(2)
    const optionDefinition = optionDefinitions.get(key)

    if (!optionDefinition) {
      throw new Error(
        `${definition.usage.split("\n")[0]} does not accept ${arg}.`,
      )
    }

    if (!optionDefinition.value) {
      options[key] = true
      continue
    }

    const value = commandArgs[index + 1]
    if (!value || value.startsWith("--")) {
      throw new Error(`${arg} requires a value.`)
    }

    options[key] = value
    index += 1
  }

  return options
}
