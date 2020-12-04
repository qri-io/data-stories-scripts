var snakeCaseKeys = require('snakecase-keys')
const splitAndTrim = (string, splitCharacter) => string.split(splitCharacter).map(d => d.trim())

const setFirstDigit = (communityBoardsServed, newFirstDigit) => {
  return communityBoardsServed.split(' ')
    .map((d) => {
      if (d.length > 0) {
        return `${newFirstDigit}${d.substring(1)}`
      }
    })
    .join(' ')
}

const processProject = (rawText, pdfFilename) => {

  const lines = rawText.split('\n')
  console.log(lines)

  let project = {}
  const milestones = []


  // loop over lines
  lines.forEach((line, i) => {
    if (line.match('Project Id')) {
      const [, projectId] = splitAndTrim(line, ':')
      project = {
        ...project,
        projectId
      }
    }

    if (line.match('Project Description')) {
      const [, projectDescription] = splitAndTrim(line, ':')
      project = {
        ...project,
        projectDescription
      }
    }

    if (line.match('Managing Agency')) {
      const [, managingAgencyId, managingAgency] = splitAndTrim(line, ':')
      project = {
        ...project,
        managingAgencyId,
        managingAgency
      }
    }

    if (line.match('Ten-Year Plan Category')) {
      const [, tenYearPlanCategory] = splitAndTrim(line, ':')
      project = {
        ...project,
        tenYearPlanCategory
      }
    }

    if (line.match('Community Boards Served')) {
      let [, communityBoardsServed] = splitAndTrim(line, ':')

      // handle erroneous community board codes
      if (pdfFilename.includes('bk')) {
        communityBoardsServed = setFirstDigit(communityBoardsServed, '3')
      }

      if (pdfFilename.includes('mn')) {
        communityBoardsServed = setFirstDigit(communityBoardsServed, '1')
      }

      if (pdfFilename.includes('bx')) {
        communityBoardsServed = setFirstDigit(communityBoardsServed, '2')
      }

      project = {
        ...project,
        communityBoardsServed
      }
    }

    if (line.match('Borough:')) {
      const [, borough] = splitAndTrim(line, ':')
      project = {
        ...project,
        borough
      }
    }

    if (line.match('Budget Lines')) {
      const [, budgetLines] = splitAndTrim(line, ':')
      project = {
        ...project,
        budgetLines
      }
    }

    if (line.match('Original Budget')) {
      let [, originalBudget] = splitAndTrim(line, ':')

      originalBudget = parseInt(originalBudget.replace(/\$|,/g, ''))

      project = {
        ...project,
        originalBudget
      }
    }

    if ( line.match('Explanation for Delay') ) {
      const explanationForDelay = splitAndTrim(lines[i + 1], ':')[0]
      project = {
        ...project,
        explanationForDelay
      }
    }

    if ( line.match('Project Location') ) {
      const projectLocation = splitAndTrim(lines[i + 1], ':')[0]
      project = {
        ...project,
        projectLocation
      }
    }

    if ( line.match('Scope Summary') ) {
      const scopeSummary = splitAndTrim(lines[i + 1], ':')[0]
      project = {
        ...project,
        scopeSummary
      }
    }

    if (line.match('Project Plan')) {
      let [,, cityPriorActuals, city2021, city2022, city2023, city2024, city2025, cityRTC, cityTotal] = lines[i + 5]
        .replace(/\s+/g, " ")
        .replace(/\$|,/g, '')
        .split(' ')
        .map(d => parseInt(d))

      let [,, nonCityPriorActuals, nonCity2021, nonCity2022, nonCity2023, nonCity2024, nonCity2025, nonCityRTC, nonCityTotal] = lines[i + 7]
        .replace(/\s+/g, " ")
        .replace(/\$|,/g, '')
        .split(' ')
        .map(d => parseInt(d))

      const combinedPriorActuals = cityPriorActuals + nonCityPriorActuals
      const combined2021 = city2021 + nonCity2021
      const combined2022 = city2022 + nonCity2022
      const combined2023 = city2023 + nonCity2023
      const combined2024 = city2024 + nonCity2024
      const combined2025 = city2025 + nonCity2025
      const combinedRTC = cityRTC + nonCityRTC
      const combinedTotal = cityTotal + nonCityTotal


      project = {
        ...project,
        cityPriorActuals,
        city2021,
        city2022,
        city2023,
        city2024,
        city2025,
        cityRTC,
        cityTotal,
        nonCityPriorActuals,
        nonCity2021,
        nonCity2022,
        nonCity2023,
        nonCity2024,
        nonCity2025,
        nonCityRTC,
        nonCityTotal,
        combinedPriorActuals,
        combined2021,
        combined2022,
        combined2023,
        combined2024,
        combined2025,
        combinedRTC,
        combinedTotal
      }
    }

    if (line.match('Milestone')) {
      // iterate over subsequent lines until 'Explanation for Delay' is found
      let endOfSection = false
      let j = i + 1 // start on the next line
      while (!endOfSection) {
        if (lines[j].match('Explanation for Delay')) {
          project = {
            ...project,
            milestones
          }
          endOfSection = true
        } else {
          if (lines[j].length > 0) {
            const [milestone, originalStart, originalEnd, currentStart, currentEnd] = splitAndTrim(lines[j], /\s{2,}/g)
            milestones.push({
              milestone,
              originalStart,
              originalEnd,
              currentStart,
              currentEnd
            })
          }
        }
        j += 1
      }
    }
  })

  project.sourcePdf = pdfFilename

  let objectOrder = {
    'project_id': null,
    'project_description': null,
  }

  console.log(project)
  return snakeCaseKeys(Object.assign(objectOrder, project))
}


module.exports = processProject
