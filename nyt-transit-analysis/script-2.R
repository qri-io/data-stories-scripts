# install.packages('tidyverse')
# install.packages('jsonlite')
# install.packages('plotly')
library(tidyverse)
library(jsonlite)
library(lubridate)
library(plotly)

# mapType takes a jsonSchema type as a string and returns the corresponding
# col_type letter abbreviation
mapType <- function(jsonSchemaType) {
  rType <- switch(
    jsonSchemaType,
    string='c',
    number='d',
    integer='i',
    boolean='l',
    '?'
  )
  return(rType)
}
# getQriDataset() takes a qri dataset reference and returns a dataframe
# it does the work to read the schema from the qri dataset so we can
# explicitly set col_types
getQriDataset <- function(datasetReference) {
  # first, get the schema (schema is a child of the qri structure component)
  # parse the json, schema will be a nested list
  structure <- system2(
    'qri',
    args = str_interp('get structure ${datasetReference} --format json'),
    stdout = TRUE
  ) %>% parse_json()
  # next, map the jsonSchema types into col_types
  # types is a string of letter abbreviations for column types
  # (character = c, integer = i, etc) for example, if the dataset had 2 string
  # columns, 3 number columns, and 1 integer column, types would be "ccdddi"
  types <- paste(
    map_chr(
      structure$schema$items$items,
      function(d) { return(mapType(d$type)) }
    ),
    collapse = ''
  )
  # now that we have a string of column types, we can use read_csv() to import
  # the dataframe to actually get the CSV string, we use system2() to call
  # qri get ... bear in mind that qri doesn't enforce column types unless you
  # ask it to, so it's possible that the values in the dataset's body may not
  #match the dataset's schema
  df = read_csv(
    system2(
      'qri',
      args=str_interp('get body ${datasetReference}'),
      stdout = TRUE
    ),
    col_names = TRUE,
    col_types = types
  )
  return(df)
}

turnstile_counts_2019 <- getQriDataset('nyc-transit-data/turnstile_daily_counts_2019') %>%
  mutate(year='2019')
turnstile_counts_2019$date <- lubridate::ymd(turnstile_counts_2019$date, tz=)
turnstile_counts_2019$complex_id <- as.character(turnstile_counts_2019$complex_id)
turnstile_counts_2019 <- mutate(turnstile_counts_2019, year_month = paste( month(date), year(date), sep="_")) %>%
  filter(division %in% c('BMT', 'IND', 'IRT')) #filter out non-nyc subway


turnstile_counts_2020 <- getQriDataset('nyc-transit-data/turnstile_daily_counts_2020') %>%
  mutate(year='2020')
turnstile_counts_2020$date <- lubridate::ymd(turnstile_counts_2020$date)
turnstile_counts_2020 <- mutate(turnstile_counts_2020, year_month = paste( month(date), year(date), sep="_")) %>%
  filter(division %in% c('BMT', 'IND', 'IRT')) #filter out non-nyc subway

turnstile_2019_2020 <- bind_rows(turnstile_counts_2019, turnstile_counts_2020)

complexes <- turnstile_counts_2019 <- getQriDataset('nyc-transit-data/remote_complex_lookupcsv')
complexes$complex_id <- as.character(complexes$complex_id)


# group by station complex and year_month

monthly_entries <- group_by(turnstile_2019_2020, complex_id, stop_name, year_month) %>%
  summarize(total_entries = sum(entries)) %>%
  separate(
    col = year_month,
    into = c("month", "year"),
    sep = "/")

# Same thing but let's use the monthly average for all of 2019 as the denominator
# instead of just September

monthly_averages_2019 <- filter(turnstile_2019_2020, year == '2019') %>%
  group_by(complex_id,  year_month) %>%
  summarize(total_entries = sum(entries)) %>%
  ungroup() %>%
  group_by(complex_id) %>%
  summarize(monthly_mean_2019 = mean(total_entries))

percent_normal <- filter(turnstile_2019_2020, year_month == '10_2020') %>%
  group_by(complex_id,  year_month) %>%
  summarize(total_entries = sum(entries)) %>%
  pivot_wider(
    names_from = year_month,
    names_prefix = 'entries_',
    values_from = total_entries
  ) %>%
  ungroup() %>%
  left_join(monthly_averages_2019, by='complex_id') %>%
  mutate(
    pct_normal_10_2020 = round((entries_10_2020 /monthly_mean_2019) * 100, digits=2)
  )

lookup <- getQriDataset('nyc-transit-data/turnstiles_station_list')
lookup$complex_id <- as.character(lookup$complex_id)

percent_normal_october_2020 <- left_join(
  percent_normal,
  distinct(select(lookup, complex_id, gtfs_longitude, gtfs_latitude, stop_name, borough, division, daytime_routes), complex_id,
           .keep_all = TRUE), by='complex_id'
) %>% relocate(monthly_mean_2019, .before = entries_10_2020, .after = NULL)

qplot(percent_normal_october_2020$pct_normal_10_2020, geom="histogram") 

write_csv(percent_normal_october_2020, '~/Desktop/percent_normal_october_2020.csv')

write_csv(drop_na(percent_normal_october_2020), '~/Sites/nyt-transit-analysis/percent-normal-october.csv')

# monthly average entries by borough
borough_monthly_averages_2019 <- filter(turnstile_2019_2020, year == '2019') %>%
  group_by(year_month, borough) %>%
  summarize(total_entries = sum(entries, na.rm=TRUE)) %>%
  ungroup() %>%
  group_by(borough) %>%
  summarize(monthly_mean_2019 = mean(total_entries, na.rm=TRUE))

# borough percent normal for October
borough_percent_normal_october_2020 <- filter(turnstile_2019_2020, year_month == '10_2020') %>%
  group_by(year_month, borough) %>%
  summarize(total_entries = sum(entries, na.rm=TRUE)) %>%
  pivot_wider(
    names_from = year_month,
    names_prefix = 'entries_',
    values_from = total_entries
  ) %>%
  ungroup() %>%
  left_join(borough_monthly_averages_2019, by='borough') %>%
  mutate(
    pct_normal_10_2020 = round((entries_10_2020 /monthly_mean_2019) * 100, digits=2)
  )

# add citywide percent normal for October

borough_percent_normal_october_2020 <- add_row(
  borough_percent_normal_october_2020,
  borough = "city",
  entries_10_2020 = sum(borough_percent_normal_october_2020$entries_10_2020),
  monthly_mean_2019 = sum(borough_percent_normal_october_2020$monthly_mean_2019),
  pct_normal_10_2020 = round((sum(borough_percent_normal_october_2020$entries_10_2020) /sum(borough_percent_normal_october_2020$monthly_mean_2019)) * 100, digits=2)
)



# horizontal bar chart of percent of normal
ggplot(data=borough_percent_normal_october_2020, aes(x=borough,y=pct_normal_10_2020)) +
  geom_bar(position="dodge",stat="identity") + 
  ylim(0, 100) +
  coord_flip() 

