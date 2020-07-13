#!/bin/bash

# generate timestamp ids, for each, download the corresponding csv of data, save it to /source-csv

read -p "Start date [default: 2018-12-29]: " STARTDATE
read -p "End date [default: $(date +"%Y-%m-%d")]: " ENDDATE

STARTDATE=${STARTDATE:-"2018-12-29"}
ENDDATE=${ENDDATE:-$(date +"%Y-%m-%d")}

STARTDOW=$(date -jf "%Y-%m-%d" $STARTDATE +%u)
ENDDOW=$(date -jf "%Y-%m-%d" $ENDDATE +%u)

STARTDAYSTOADD=$(((7 - $STARTDOW + 6) % 7))
ENDDAYSOTOADD=$(((7 - $ENDDOW + 6) % 7))

STARTWEEK=$(date -j -v +"$STARTDAYSTOADD"d -f "%Y-%m-%d" $STARTDATE +%y%m%d)
ENDWEEK=$(date -j -v +"$ENDDAYSOTOADD"d -f "%Y-%m-%d" $ENDDATE +%y%m%d)

d=$STARTWEEK
while [ "$d" != "$ENDWEEK" ]; do
  curl -o source-csv/$d.csv http://web.mta.info/developers/data/nyct/turnstile/turnstile_$d.txt | sed 's/"//g'
  d=$(date -j -v +7d -f "%y%m%d" $d +%y%m%d)
done
