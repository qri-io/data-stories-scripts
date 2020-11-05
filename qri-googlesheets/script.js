const fs = require('fs')
const qri = require('@qri-io/qri-node')()
const fetch = require('node-fetch')

const TEMP_DIR = '/tmp'

var output = {}

const downloadFile = (async (url, path) => {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(path)
  await new Promise((resolve, reject) => {
      res.body.pipe(fileStream)
      res.body.on("error", reject)
      fileStream.on("finish", resolve)
    })
})


async function main() {
    // get csv from google sheet using public sharing URL
    // See https://stackoverflow.com/a/61107170
    const csvURL = 'https://docs.google.com/spreadsheets/d/1YiKHmeA6V8LvDYz-Ju1dw6RUEjWZjJPwIhan_3kJz-4/gviz/tq?tqx=out:csv&sheet=Best Pizza Place in Every State'
    const csvPath = `${__dirname}${TEMP_DIR}/body.csv`

    await downloadFile(csvURL, csvPath)

    await qri.save('me/best-pizza-place-in-every-state', {
      body: csvPath
    })

    // qri push
    await qri.push('me/best-pizza-place-in-every-state')
}

main()
