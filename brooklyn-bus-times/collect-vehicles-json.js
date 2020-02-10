const fs = require('fs-extra')
const util = require('util')
const moment = require('moment')
const jsonexport = require('jsonexport')

const readdir = util.promisify(fs.readdir)
const readFile = util.promisify(fs.readFile)

fs.ensureDir('./output')


const deriveTimestamps = async (startTime, endTime) => {
  const startTimeUnix = moment(startTime).unix()
  const endTimeUnix = moment(endTime).unix()

  console.log(startTimeUnix, endTimeUnix)

  try {
    // read all filenames in /data
    fileNames = await readdir('./data');

    // use regex to get the timestamps
    const fileTimestamps = fileNames.map((fileName) => {
      const match = fileName.match(/[0-9]{10}/)
      return match[0]
    })

    console.log(`./data contains ${fileTimestamps.length} timestamps`)

    // filter for unique since each appears twice
    const uniqueTimestamps = fileTimestamps
      .filter((timestamp, i, self) => self.indexOf(timestamp) === i);

    // filter for timestamps within range
    const inRangeTimestamps = uniqueTimestamps.filter((timestamp) => {
      return timestamp > startTimeUnix && timestamp < endTimeUnix
    })

    console.log(`${inRangeTimestamps.length} timestamps are within the specified range`)

    return inRangeTimestamps

  } catch (err) {
    console.log(err);
  }
}

const collectData = async (timestamps) => {
  // create writebuffer
  const output = fs.createWriteStream('./output/vehicles.csv')

  // loop over timestamps
  for ( const [i, timestamp] of timestamps.entries()) {
    // read the file, parse json array of objects
    const fileBuffer = await readFile(`./data/vehicles-${timestamp}.json`)
    let data = JSON.parse(fileBuffer)

    // append the timestamp to each observation
    // some don't have a progessStatus, make sure it's an empty string
    data = data.map(d => ({
      timestamp,
      progressStatus: d.progressStatus || '',
      ...d
    }))

    // each object becomes a row
    jsonexport(data, {
      includeHeaders: (i === 0)
    }, (err, csv) => {
      if(err) return console.log(err);
      output.write(csv)
      output.write('\n')
    });
  }
}


// given a time range, collect files from /data, convert to CSV rows and write to file
(async () => {
  const startTime = '2020-01-28T06:00:00-0500'
  const endTime = '2020-01-28T09:00:00-0500'

  // get unique filename timestamps in the specified range from the directory of json files
  const timestamps = await deriveTimestamps(startTime, endTime)
  collectData(timestamps)
})()
