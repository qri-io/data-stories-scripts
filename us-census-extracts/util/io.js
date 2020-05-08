const fs = require('fs-extra')
const readline = require('readline')

const reader = (inputPath) => {
  return readline.createInterface({
    input: fs.createReadStream(inputPath),
    console: false
  })
}

const writer = async (outputPath, value, type) => {
  var outputString = value
  if (typeof value !== 'string') {
    outputString = JSON.stringify(value, null, 2)
  }

  await fs.ensureFile(outputPath)
  const output = fs.createWriteStream(outputPath)
  if (type === 'buffer') {
    output.write(Buffer.from(value))
    return
  }
  return output.write(outputString)
}

module.exports = {
  reader,
  writer
}
