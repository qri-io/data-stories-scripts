# Weekly update script
# To use, call with YYMMDD for the latest file as first argument
# sh update.sh 200418

THEDATE=$1

# 1 - download new data
echo "Fetching raw data for week ending $THEDATE"
curl -o source-csv/$THEDATE.csv http://web.mta.info/developers/data/nyct/turnstile/turnstile_$THEDATE.txt | sed 's/"//g'

# 2 - import to a temporary table
sh import/import-csv.sh $THEDATE

# 3 - update net values
psql postgresql://postgres:password@localhost:5432/postgres -f sql/update-net-values.sql

# 4 - update daily_subunit
psql postgresql://postgres:password@localhost:5432/postgres -f sql/update-daily-subunit.sql

# 5 - update daily_complex
psql postgresql://postgres:password@localhost:5432/postgres -f sql/update-daily-complex.sql

# 6 - update 2020 table
psql postgresql://postgres:password@localhost:5432/postgres -f sql/update-2020.sql

#7 - export 2020 table to csv
psql postgresql://postgres:password@localhost:5432/postgres -c "Copy (Select * From daily_counts_2020) To STDOUT With CSV HEADER DELIMITER ',';" > tmp/daily_counts_2020.csv
