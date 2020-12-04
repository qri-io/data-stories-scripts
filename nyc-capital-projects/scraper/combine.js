const fs = require('fs-extra')
const ObjectsToCsv = require('objects-to-csv');
// open json files
// iterate over pdfs in /pdf
const jsons = fs.readdirSync('./json')

let combinedRaw = []

jsons.forEach((json) => {
  const jsonRaw = require(`./json/${json}`)
  combinedRaw = [
    ...combinedRaw,
    ...jsonRaw
  ]
})

// save milestones only
const milestones = combinedRaw.reduce((acc, curr) => {
  const projectMilestones = curr.milestones.map((d) => {
    return {
      project_id: curr.project_id,
      ...d
    }
  })

  return [
    ...acc,
    ...projectMilestones
  ]
}, [])

// write to csv
const milestoneCSV = new ObjectsToCsv(milestones);

// Save to file:
fs.ensureDirSync('./csv')
milestoneCSV.toDisk('./csv/milestones.csv');

// remove the milestones
combinedRaw = combinedRaw.map((d) => {
  delete d.milestones
  return d
})

// console.log(combinedRaw[0])

// write to csv
const combinedCSV = new ObjectsToCsv(combinedRaw);

// Save to file:
combinedCSV.toDisk('./csv/combined.csv');
