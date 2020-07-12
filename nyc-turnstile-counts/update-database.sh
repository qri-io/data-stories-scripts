# Weekly update script
# To use, call with YYMMDD for the latest file as first argument
# sh update.sh 200418

THEDATE=$1
read -p "Postgres user [default: postgres]: " USERNAME
echo "Postgres password [default: password]: "
read -s PASSWORD
read -p "Postgres database: " DATABASE

USERNAME=${USERNAME:-"postgres"}
PASSWORD=${PASSWORD:-"password"}

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# 1 - download new data
echo "Fetching raw data for week ending $THEDATE"
curl -o source-csv/$THEDATE.csv http://web.mta.info/developers/data/nyct/turnstile/turnstile_$THEDATE.txt | sed 's/"//g'

# 2 - import to a temporary table
sh $DIR/import/import-csv.sh $THEDATE $USERNAME $PASSWORD $DATABASE

# 3 - update net values
psql postgresql://$USERNAME:$PASSWORD@localhost:5432/$DATABASE -f $DIR/sql/update-net-values.sql

# 4 - update daily_subunit
psql postgresql://$USERNAME:$PASSWORD@localhost:5432/$DATABASE -f $DIR/sql/update-daily-subunit.sql

# 5 - update daily_complex
psql postgresql://$USERNAME:$PASSWORD@localhost:5432/$DATABASE -f $DIR/sql/update-daily-complex.sql

# 6 - update 2020 table
psql postgresql://$USERNAME:$PASSWORD@localhost:5432/$DATABASE -f $DIR/sql/update-2020.sql

#7 - export 2020 table to csv
psql postgresql://$USERNAME:$PASSWORD@localhost:5432/$DATABASE -c "Copy (Select * From daily_counts_2020) To STDOUT With CSV HEADER DELIMITER ',';" > $DIR/tmp/daily_counts_2020.csv
