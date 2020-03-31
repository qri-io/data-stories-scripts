#!/bin/bash

# iterate over the timestamp ids, for each, download the corresponding csv of data, save it to /source-csv

jq -c '.[]' weekly-timestamps.json | while read i; do
    DATESTRING="${i//\"/}"
    curl -o source-csv/$DATESTRING.csv http://web.mta.info/developers/data/nyct/turnstile/turnstile_$DATESTRING.txt | sed 's/"//g'
done
