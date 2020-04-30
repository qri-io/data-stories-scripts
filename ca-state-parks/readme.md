# Scraping the California State Parks search page for offline access

### Related stories

- [medium.com/qri-io/scraping-the-california-state-parks-search-page-for-offline-access](https://medium.com/qri-io/scraping-the-california-state-parks-search-page-for-offline-access-d05c48be69a9)
- [medium.com/qri-io/how-to-use-qri-features-to-build-a-better-dataset](https://medium.com/qri-io/how-to-use-qri-features-to-build-a-better-dataset-2d236da626f0)


### Files
- parkindex_to_csv.py: Generate a `.csv` file from https://www.parks.ca.gov/parkindex
- csv_to_kml.py: Generate a `.kml` file from the `.csv` we generated.
- ca_parks.kml: `.kml` file showing all California State Parks with hike and bike campsites.
- ca_parks.kmz: `.kmz` is `.kml` with zip compression. Same data.
- transform.star: Extract park information from https://www.parks.ca.gov/parkindex to generate body.csv and structure.json