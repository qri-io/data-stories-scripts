#!/usr/bin/env python3

"""Extract park information from
https://www.parks.ca.gov/parkindex
to generate a csv file"""

import re
import json
import csv

# We have the file locally
# if you do not:
# curl -O 'https://www.parks.ca.gov/parkindex'
lines = open("parkindex", "r").readlines()

for i in lines:
    match = re.match("^[ \t]+var vParksJson = (.*);\n", i)
    if not match:
        continue

    jsonblob = match.group(1)
    break

parsed = json.loads(jsonblob)

csvfile = csv.writer(open("ca_state_parks.csv", "w"))

# Print a header row before we iterate data rows
csvfile.writerow(parsed[0].keys())

for i in parsed:
    csvfile.writerow(i.values())
