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

# given a month, get data for each station complex
# station_complex | 2019_entries | 2020_entries | delta

# group by station complex and year_month

monthly_entries <- group_by(turnstile_2019_2020, complex_id, stop_name, year_month) %>%
  summarize(total_entries = sum(entries)) %>%
  separate(
    col = year_month,
    into = c("month", "year"),
    sep = "/")



pivoted <- pivot_wider(
  monthly_entries,
  names_from = year,
  names_prefix = 'entries_',
  values_from = total_entries
) %>% mutate(pct_change = round(((entries_2020 - entries_2019) / (entries_2019)) * 100, digits=2))

# april

april <- filter(pivoted, month == 4)
april_largest_deltas <- arrange(april, pct_change) %>% head(15)
april_smallest_deltas <-arrange(april, desc(pct_change)) %>% head(15)


# Comparing full month of April to full month of September
# Let's look at % increase by station complex


only_april_and_september <- filter(monthly_entries, month == 4 | month == 9 ) %>%
  pivot_wider(
    names_from = year,
    names_prefix = 'entries_',
    values_from = total_entries
  ) %>% mutate(pct_change = round(((entries_2020 - entries_2019) / (entries_2019)) * 100, digits=2)) %>%
  arrange(desc(pct_change)) %>% head(15)

monthly_2020 <- group_by(turnstile_counts_2020, complex_id, stop_name, borough, year_month) %>%
  summarize(total_entries = sum(entries)) %>%
  separate(
    col = year_month,
    into = c("month", "year"),
    sep = "/") %>%
  filter(month == 4 | month == 9 )

monthly_2020_pivoted <- pivot_wider(
  monthly_2020,
  names_from = month,
  names_prefix = 'entries_',
  values_from = total_entries
) %>%
  mutate(pct_change = round(((entries_9 - entries_4) / (entries_4)) * 100)) %>%
  mutate( complex_id = fct_reorder(complex_id, pct_change)) %>%
  # filter(complex_id != 196) #remove the big outlier, aqueduct racetrack, which had 2500% increase
  
  biggest_increases <-  arrange(monthly_2020_pivoted, desc(pct_change)) %>% head(15)
# smallest_increases <-  arrange(monthly_2020_pivoted, pct_change) %>% head(15)

# The recovery ranges from 34% - 997% or from .03x to 10x

# Lets see that as a histogram


fig <- plot_ly(
  data = monthly_2020_pivoted,
  x = ~reorder(complex_id, pct_change),
  y = ~pct_change,
  type = "bar",
  color = ~borough,
  colors = c(Q = '#7fc97f', M = '#beaed4', Bk = '#fdc086', Bx = '#ffff99')
) %>% layout(title = '% increase in monthly entries by station complex, April - September 2020',
             xaxis = list(
               title = "complex id",
               tickfont = list(
                 size = 14,
                 color = 'rgb(107, 107, 107)')))

fig


# let's try to reproduce this borough chart from https://www.nytimes.com/interactive/2020/05/15/upshot/who-left-new-york-coronavirus.html

renderLinesChart <- function(b, data) {
  
  #brooklyn only
  brooklyn_2020 <- filter(data, borough == b) %>%
    select(date,complex_id,entries) %>%
    mutate(week = week(date)) %>%
    group_by(week, complex_id) %>%
    summarize(total_entries = sum(entries))
  
  brooklyn_2020_pivoted <- pivot_wider(
    brooklyn_2020,
    names_from = complex_id,
    names_prefix = 'station_',
    values_from = total_entries
  ) %>%
    mutate(week_date = ymd( "2020-01-01" ) + weeks( week - 1 )) %>%
    select(week, week_date, everything()) %>%
    ungroup() %>%
    filter(week > 12 & week < 40)
  
  View(brooklyn_2020_pivoted)
  
  fig <- plot_ly(brooklyn_2020_pivoted) %>%
    layout(showlegend = FALSE, yaxis = list(title = "entries", range = c(0,275000)))
  for(k in 1:length(brooklyn_2020_pivoted)) {
    if (k < 3) { # skip first two columns
      next
    }
    fig <- add_trace(
      fig,
      x=brooklyn_2020_pivoted[['week_date']],
      y=brooklyn_2020_pivoted[[k]],
      type="scatter",
      mode="lines",
      line = list(color = '#34495e', width = 1),
      opacity = 0.3
    )
  }
  fig
}


# boroughs <- c('M', 'Bk', 'Q', 'Bx')
# for (borough in boroughs) {
#   renderLinesChart(borough, turnstile_counts_2020)
# }


renderLinesChart('Bk', turnstile_counts_2020)

# try the same viz but show % difference from 2019

#brooklyn only
borough <- filter(turnstile_2019_2020, borough == 'Bk') %>%
  select(date,year, complex_id,entries) %>%
  mutate(week = week(date)) %>%
  group_by(week, complex_id, year) %>%
  summarize(total_entries = sum(entries))

borough_pivoted <- pivot_wider(
  borough,
  names_from = year,
  names_prefix = 'year_',
  values_from = total_entries
) %>%
  mutate(
    week_date = ymd( "2020-01-01" ) + weeks( week - 1 ),
    pct_change = round(((year_2020 - year_2019) / (year_2019)) * 100, digits=2)
  ) %>%
  select(week, week_date, complex_id, pct_change) %>%
  pivot_wider(
    names_from = complex_id,
    names_prefix = 'station_',
    values_from = pct_change
  ) %>%
  ungroup() %>%
  filter(week > 12 & week < 40)

fig <- plot_ly(borough_pivoted) %>%
  layout(showlegend = FALSE, yaxis = list(title = "entries", range = c(-100,0)))
for(k in 1:length(borough_pivoted)) {
  if (k < 3) { # skip first two columns
    next
  }
  fig <- add_trace(
    fig,
    x=borough_pivoted[['week_date']],
    y=borough_pivoted[[k]],
    type="scatter",
    mode="lines",
    line = list(color = '#34495e', width = 1),
    opacity = 0.3
  )
}
fig


# Let's map stations by % of normal, comparing September 2020 to September

percent_normal <- filter(turnstile_2019_2020, year_month == '9/2020' | year_month == '9/2019') %>%
  group_by(complex_id,  year_month) %>%
  summarize(total_entries = sum(entries)) %>%
  separate(
    col = year_month,
    into = c("month", "year"),
    sep = "/") %>%
  pivot_wider(
    names_from = year,
    names_prefix = 'entries_',
    values_from = total_entries
  ) %>% mutate(pct_of_normal = round((entries_2020 /entries_2019) * 100,digits=2))

lookup <- getQriDataset('nyc-transit-data/turnstiles_station_list')
lookup$complex_id <- as.character(lookup$complex_id)

joined_with_geometries = left_join(percent_normal, distinct(select(lookup, complex_id, gtfs_longitude, gtfs_latitude), complex_id, .keep_all = TRUE), by='complex_id', )
write_csv(drop_na(joined_with_geometries), '~/Desktop/pct-of-normal.csv')

# pct of normal ranges from 9% to 100%

# add bins, may as well just to 0-25-5-100
with_bins = percent_normal %>% mutate(bin=cut(pct_of_normal, breaks = c(0,10,20,30,40,50,60,70,80,90, 100, 110), labels=c('<10%', '10-20%', '20-30%', '30-40%', '40-50%', '50-60%', '60-70%','70-80%', '80-90%', '90-100%', '>100%')))

grouped_for_chart <- group_by(with_bins, bin) %>% summarize(count = n())

fig <- plot_ly(
  grouped_for_chart,
  x = ~bin,
  y = ~count,
  type = "bar"
) %>% layout(
  title = "Count of stations by percent of normal entries - September 2020",
  xaxis = list(
    title = "Percent of Normal (September 2020 entries vs Sep 2019 entries)"
  )
)

fig


# Same thing but let's use the monthly average for all of 2019 as the denominator
# instead of just September

monthly_averages_2019 <- filter(turnstile_2019_2020, year == '2019') %>%
  group_by(complex_id,  year_month) %>%
  summarize(total_entries = sum(entries)) %>%
  ungroup() %>%
  group_by(complex_id) %>%
  summarize(monthly_mean_2019 = mean(total_entries))

percent_normal <- filter(turnstile_2019_2020, year_month == '9_2020') %>%
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
    pct_normal_9_2020 = round((entries_9_2020 /monthly_mean_2019) * 100, digits=2)
  )

lookup <- getQriDataset('nyc-transit-data/turnstiles_station_list')
lookup$complex_id <- as.character(lookup$complex_id)

joined_with_geometries = left_join(
  percent_normal,
  distinct(select(lookup, complex_id, gtfs_longitude, gtfs_latitude, stop_name, borough), complex_id,
           .keep_all = TRUE), by='complex_id'
) %>% relocate(monthly_mean_2019, .before = entries_9_2020, .after = NULL)



write_csv(drop_na(joined_with_geometries), '~/Desktop/percent-normal-september.csv')

# pct of normal ranges from 9% to 100%

# add bins, may as well just to 0-25-5-100


# Ridership fell dramatically in Manhattan, dropping around X percent at most stations,


monthly_2019 <- filter(turnstile_2019_2020, year == 2019) %>%
  group_by(year_month) %>%
  summarize(total_entries = sum(entries, na.rm = TRUE))

monthly_mean_2019 <- mean(monthly_2019$total_entries)

april_2020 <- filter(turnstile_2019_2020, year_month == '4_2020')
entries_april_2020 <- sum(april_2020$entries, na.rm = TRUE)

april_percent_normal <- entries_april_2020 / monthly_mean_2019

september_2020 <- filter(turnstile_2019_2020, year_month == '9_2020')
entries_september_2020 <- sum(september_2020$entries, na.rm = TRUE)

september_percent_normal <- entries_september_2020 / monthly_mean_2019


borough_percents_april <- group_by(joined_with_geometries, borough) %>% summarize(mean_pct_normal_april = mean(pct_normal_4_2020, na.rm = TRUE))

renderPctChart <- function(b, data) {
  
  #brooklyn only
  borough_filtered <- filter(data, borough == b) %>%
    select(date,complex_id,entries, year) %>%
    mutate(week = week(date)) %>%
    group_by(week, complex_id, year) %>%
    summarize(total_entries = sum(entries)) %>%
    ungroup() %>%
    pivot_wider(
      names_from = year,
      names_prefix = 'entries_',
      values_from = total_entries
    ) %>% 
    mutate(percent_normal = (entries_2020 / entries_2019) * 100)

  
  borough_2020_pivoted <- select(borough_filtered, week, complex_id, percent_normal) %>%
  pivot_wider(
    names_from = complex_id,
    names_prefix = 'station_',
    values_from = percent_normal
  ) %>%
    mutate(week_date = ymd( "2020-01-01" ) + weeks( week - 1 )) %>%
    select(week, week_date, everything()) %>%
    ungroup() 
  
  fig <- plot_ly(borough_2020_pivoted) %>%
    layout(showlegend = FALSE, yaxis = list(title = "percent of usual", range = c(0,100)))
  for(k in 1:length(borough_2020_pivoted)) {
    if (k < 3) { # skip first two columns
      next
    }
    fig <- add_trace(
      fig,
      x=borough_2020_pivoted[['week_date']],
      y=borough_2020_pivoted[[k]],
      type="scatter",
      mode="lines",
      line = list(color = '#34495e', width = 1),
      opacity = 0.3
    )
  }
  fig
    
}


renderPctChart('Bk', turnstile_2019_2020)

# group stations by neighborhood, get the same "percent of usual" for these neighborhood clusters
# find a neighborhood metric that has the same
