#!/bin/bash

# generate timestamp ids, for each, import the corresponding CSV into the table turnstilesraw

read -p "Postgres user [default: postgres]: " USERNAME
echo "Postgres password [default: password]: "
read -s PASSWORD
read -p "Postgres database: " DATABASE
read -p "Start date [default: 2018-12-29]: " STARTDATE
read -p "End date [default: $(date +"%Y-%m-%d")]: " ENDDATE

USERNAME=${USERNAME:-"postgres"}
PASSWORD=${PASSWORD:-"password"}

STARTDATE=${STARTDATE:-"2018-12-29"}
ENDDATE=${ENDDATE:-$(date +"%Y-%m-%d")}

STARTDOW=$(date -jf "%Y-%m-%d" $STARTDATE +%u)
ENDDOW=$(date -jf "%Y-%m-%d" $ENDDATE +%u)

STARTDAYSTOADD=$(((7 - $STARTDOW + 6) % 7))
ENDDAYSOTOADD=$(((7 - $ENDDOW + 6) % 7))

STARTWEEK=$(date -j -v +"$STARTDAYSTOADD"d -f "%Y-%m-%d" $STARTDATE +%y%m%d)
ENDWEEK=$(date -j -v +"$ENDDAYSOTOADD"d -f "%Y-%m-%d" $ENDDATE +%y%m%d)

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

d=$STARTWEEK
while [ "$d" != "$ENDWEEK" ]; do
  sh $DIR/import-csv.sh $d $USERNAME $PASSWORD $DATABASE
  d=$(date -j -v +7d -f "%y%m%d" $d +%y%m%d)
done
