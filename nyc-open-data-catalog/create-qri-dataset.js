// creates and publishes a qri dataset from the csv in tmp/output.csv
const qri = require(`${__dirname}/../../../qri/node-qri`)

qri.save('me/catalog-metadata', {
  body: `${__dirname}/tmp/output.csv`,
  file: [
    `${__dirname}/tmp/meta.json`,
    `${__dirname}/tmp/readme.md`,
    `${__dirname}/tmp/structure.json`
  ]
})

qri.publish('me/catalog-metadata')
