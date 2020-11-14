library(tidyverse)
library(janitor)


processMonth <- function(month) {
  raw <- read_csv(paste("/Users/chriswhong/Sites/citibike-daily/raw/", month, '-citibike-tripdata.csv', sep=''))
  
  # clean names, extract the date from the timestamp
  daily <- clean_names(raw) %>% mutate(date = as.Date(starttime))
  
  startstations <- distinct(daily, start_station_id, .keep_all = TRUE) %>%
    select(start_station_id, start_station_name, start_station_longitude, start_station_latitude) %>%
    rename(station_id = start_station_id, station_name = start_station_name, station_longitude=start_station_longitude, station_latitude = start_station_latitude)
  
  endstations <- distinct(daily, end_station_id, .keep_all = TRUE) %>%
    select(end_station_id, end_station_name, end_station_longitude, end_station_latitude) %>%
    rename(station_id = end_station_id, station_name = end_station_name, station_longitude=end_station_longitude, station_latitude = end_station_latitude)
  
  station_lookup <- bind_rows(startstations, endstations) %>% distinct(station_id, .keep_all = TRUE)
  
  
  # count daily trip starts for each station/date
  daily_starts <- group_by(daily, date, start_station_id) %>%
    summarize(startcount = n()) %>%
    rename(station_id = start_station_id)
  
  # count daily trip ends for each station/date
  daily_ends <- group_by(daily, date, end_station_id) %>%
    summarize(endcount = n()) %>%
    rename(station_id = end_station_id)
  
  # full join them so we don't lose any where there were starts but not ends and vice versa
  combined <- full_join(daily_starts, daily_ends, by = c('date', 'station_id'))
  
  with_station_info <- left_join(combined, station_lookup, by='station_id')
  
  return with_station_info
  
}

dailies <- list()

months <- c('202001', '202002', '202003', '202004', '202005', '202006', '202007', '202008', '202009', '202010')
for (i in months) {
  dailies[[i]] <- processMonth(i)
}

# combine all of the months into a single table
for (i in seq_along(months)) {
  if (i == 1) {
    combined <- dailies[[months[1]]]
  } else {
    combined <- bind_rows(combined, dailies[[months[i]]])
  }
}

# write to CSV
write_csv(combined, '/Users/chriswhong/Sites/citibike-daily/citibike-daily-counts-2020.csv')

daily_count <- group_by(combined, date) %>% summarize(total_trips = sum(startcount, na.rm=TRUE), )
write_csv(daily_count, '/Users/chriswhong/Sites/citibike-daily/by-day.csv')


