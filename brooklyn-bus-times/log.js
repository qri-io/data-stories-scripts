const util = require('util')
const fetch = require('node-fetch')
const convert = require('xml-js')
const moment = require('moment')
const fs = require('fs-extra')

require('dotenv').config()

// this will be the timestamp for this fetch of the data, and will be used to write a file
const timestamp = moment().unix()

const MTA_API_KEY = process.env.MTA_API_KEY

// to be run every minute
// executes a call for every stop on the route

// stop ids for the b67
const stopIds = [
  // northbound
  306566,
  306549,
  306550,
  306551,
  307102,
  306868,
  306553,
  306554,
  306555,
  306556,
  306571,
  305624,
  306421,
  305626,
  305627,
  305628,
  305629,
  305630,
  307936,
  305632,
  305633,
  305634,
  305635,
  305636,
  307210,
  303253,
  308641,
  303254,
  303256,
  306892,
  303258,
  303259,
  306969,
  306961,
  306962,
  901510,
  306796,
  901329,
  901331,
  901332,
  901333,
  901290,

  // southbound
  901334,
  305191,
  901335,
  901336,
  308692,
  307039,
  901338,
  306337,
  307106,
  306264,
  307426,
  305211,
  303290,
  306901,
  303294,
  303524,
  303296,
  303297,
  307360,
  305670,
  305671,
  305672,
  305673,
  305674,
  305675,
  305676,
  305677,
  305678,
  305679,
  305680,
  305681,
  305682,
  307521,
  306573,
  306574,
  306558,
  306559,
  306560,
  306561,
  306562,
  306563,
  306564,
  306565,
  801044
]

const buildApiCall = stopId => `
  http://bustime.mta.info/api/siri/stop-monitoring.xml?key=${MTA_API_KEY}&OperatorRef=MTA&MonitoringRef=${stopId}&LineRef=MTA NYCT_B67
`

// removes the _text attribute that xml-js adds by default
// from https://github.com/nashwaan/xml-js/issues/53
const removeJsonTextAttribute = function (value, parentElement) {
  try {
    const pOpKeys = Object.keys(parentElement._parent)
    const keyNo = pOpKeys.length
    const keyName = pOpKeys[keyNo - 1]
    const arrOfKey = parentElement._parent[keyName]
    const arrOfKeyLen = arrOfKey.length
    if (arrOfKeyLen > 0) {
      const arr = arrOfKey
      const arrIndex = arrOfKey.length - 1
      arr[arrIndex] = value
    } else {
      parentElement._parent[keyName] = value
    }
  } catch (e) {}
}

// fetch raw data for a stop and transform it for our needs
const getStopData = (stopId) => {
  const apiCall = buildApiCall(stopId)
  console.log(`Fetching stop ${stopId}`)
  console.log(apiCall)
  return fetch(apiCall)
    .then(d => d.text())
    .then(xml => {
      const json = convert.xml2js(xml, {
        compact: true,
        textFn: removeJsonTextAttribute
      })

      json.Siri.ServiceDelivery.StopMonitoringDelivery
      // console.log(util.inspect(json.Siri.ServiceDelivery.StopMonitoringDelivery, false, null, true /* enable colors */))

      let stopVisit = json.Siri.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit

      if (!stopVisit) return {
        error: true,
        message: 'no MonitoredStopVisit'
      }


      // MonitoredStopVisit is an object if there is only one vehicle, array if many
      if (Array.isArray(stopVisit)) stopVisit = stopVisit[0]

      const { MonitoredVehicleJourney, RecordedAtTime: recordedAtTime } = stopVisit

      if (!MonitoredVehicleJourney) return {
        error: true,
        message: 'no MonitoredVehicleJourney'
      }

      const { MonitoredCall } = stopVisit.MonitoredVehicleJourney
      const {
        StopPointName: stopName,
        ExpectedArrivalTime: expectedArrivalTime
      } = MonitoredCall

      let expectedArrivalSeconds = null

      if (expectedArrivalTime) {
        expectedArrivalSeconds = moment(recordedAtTime).diff(moment(expectedArrivalTime), 'seconds')
      }

      return {
        requestTime: moment().toISOString(true),
        stopId,
        stopName,
        recordedAtTime,
        expectedArrivalTime,
        expectedArrivalSeconds
      }
    })
}

const loopOverStops = async () => {
  console.log(`Fetching real time data for ${stopIds.length} stops`)
  const allStops = []

  for (let i = 0; i < stopIds.length; i++) {
    const stopId = stopIds[i]
    const stopData = await getStopData(stopId)
    console.log(util.inspect(stopData, false, null, true /* enable colors */))
    allStops.push(stopData)
  }
  console.log('Done!')
  const filepath = `./data/stops-${timestamp}.json`
  await fs.ensureFile(filepath)
  console.log(`Writing to ${filepath}`)
  // save to file with unix timestamp as filename
  await fs.writeJson(filepath, allStops)
}

const getVehicleLocations = async () => {
  const apiCall = `http://bustime.mta.info/api/siri/vehicle-monitoring.xml?key=${MTA_API_KEY}&OperatorRef=MTA&LineRef=MTA NYCT_B67`

  await fetch(apiCall)
    .then(d => d.text())
    .then(async (xml) => {
      const json = convert.xml2js(xml, {
        compact: true,
        textFn: removeJsonTextAttribute
      })

      const { VehicleActivity } = json.Siri.ServiceDelivery.VehicleMonitoringDelivery

      const vehicleLocations = VehicleActivity.map((vehicle) => {
        const { RecordedAtTime: recordedAtTime, MonitoredVehicleJourney } = vehicle
        console.log(MonitoredVehicleJourney)
        const {
          DirectionRef: directionRef,
          JourneyPatternRef: journeyPatternRef,
          VehicleLocation,
          Bearing: bearing,
          ProgressRate: progressRate,
          ProgressStatus: progressStatus,
          VehicleRef: vehicleRef } = MonitoredVehicleJourney
        const { Longitude: longitude, Latitude: latitude } = VehicleLocation

        return {
          recordedAtTime,
          directionRef,
          journeyPatternRef,
          bearing,
          progressRate,
          progressStatus,
          vehicleRef,
          longitude,
          latitude
        }
      })

      console.log(util.inspect(VehicleActivity, false, null, true /* enable colors */))

      const filepath = `./data/vehicles-${timestamp}.json`
      await fs.ensureFile(filepath)
      console.log(`Writing to ${filepath}`)
      // save to file with unix timestamp as filename
      await fs.writeJson(filepath, vehicleLocations)
    })
}

loopOverStops()
getVehicleLocations()
