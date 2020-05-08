// iterate over directories in /tmp
// save a new qri dataset and publish
const fs = require('fs-extra');
const qri = require('../../../qri/node-qri');

(async () => {
  const datasets = fs.readdirSync('./tmp')
  console.log(datasets.length)

  for (let i = 0; i < datasets.length; i++) {
    const datasetName = datasets[i]


    console.log(`saving me/${datasetName}...`)
    await qri.save(`me/${datasetName}`, {
      body: `${__dirname}/tmp/${datasetName}/body.csv`,
      file: [
        `${__dirname}/tmp/${datasetName}/meta.json`,
        `${__dirname}/tmp/${datasetName}/readme.md`,
        `${__dirname}/tmp/${datasetName}/structure.json`
      ]
    })

    console.log(`publishing me/${datasetName}...`)
    await qri.publish(`me/${datasetName}`)
  }
})()
