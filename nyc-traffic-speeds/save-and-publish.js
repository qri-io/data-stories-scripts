// iterate over directories in /tmp
// save a new qri dataset and publish
const fs = require('fs-extra');
const moment = require('moment');
const qri = require('../../../qri/node-qri');

(async () => {
  const months = fs.readdirSync('./tmp')
  console.log(months)

  for (let i = 0; i < months.length; i++) {
    const currentMonth = months[i]
    const [month, year] = moment(`${currentMonth}-01`).format('MMMM YYYY').split(' ')
    const datasetName = `nyc-traffic-speeds-${month.toLowerCase()}-${year}`
  //
  //   console.log(`saving me/${datasetName}...`)
  //   await qri.save(`me/${datasetName}`, {
  //     body: `${__dirname}/tmp/${currentMonth}/body.csv`,
  //     file: [
  //       `${__dirname}/tmp/${currentMonth}/meta.json`,
  //       `${__dirname}/tmp/${currentMonth}/readme.md`,
  //       `${__dirname}/tmp/${currentMonth}/structure.json`
  //     ]
  //   })
    //
    console.log(`publishing me/${datasetName}...`)
    await qri.publish(`me/${datasetName}`)
  }
})()
