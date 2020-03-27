#!/usr/bin/env python3

"""Generate .kml file from .csv at
https://qri.cloud/feep/ca_state_parks"""

import csv
import simplekml  # pip3 install simplekml

# This script runs on a newer version of the dataset than
# parkindex_to_csv.py generates. We need to download from
# qri.cloud
csvfile = csv.DictReader(open("./ca_state_parks/body.csv", "r"))


def writekml(hits):
    kml = simplekml.Kml(
        name="CA State Parks with Hike & Bike sites",
        description="""Generated from the dataset at https://qri.cloud/feep/ca_state_parks .
Read more at https://medium.com/@feeping/scraping-the-california-state-parks-search-page-for-offline-access .""",
    )

    for i in hits:
        kml.newpoint(
            name=i["long_name"],
            coords=([(i["Longitude"], i["Latitude"])]),
            # Without crawling further, we have no contact
            # information but we can generate a url
            description=f"https://www.parks.ca.gov/?page_id={i['page_id']}",
        )

    kml.save("ca_parks.kml")
    kml.savekmz("ca_parks.kmz")


hits = []

for i in csvfile:
    # currently this column is a string field
    if i["Hike or Bike Campsites"] == "1":
        hits.append(i)

writekml(hits)
