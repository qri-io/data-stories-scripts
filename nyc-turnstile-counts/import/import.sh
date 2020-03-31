#!/bin/bash

# iterate over the timestamp ids, for each, import the corresponding CSV into the table turnstilesraw

jq -c '.[]' weekly-timestamps.json | while read i; do
    DATESTRING="${i//\"/}"
    sh import-csv.sh $DATESTRING
done
