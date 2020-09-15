# Tinkering with Qri Datasets from a local RStudio environment
# load packages
library(tidyverse)
library(jsonlite)
library(purrr)
library(plotly)

#getType takes a jsonSchema type as a string and returns the corresponding col_type letter abbreviation
mapType <- function(jsonSchemaType) {
  rType <- switch(jsonSchemaType, string='c', number='d', integer='i', boolean='l', '?')
  return(rType)
}

# getQriDataset() takes a qri dataset reference and returns a dataframe
# it does the work to read the schema from the qri dataset so we can explicitly set col_types
getQriDataset <- function(datasetReference) {
  
  # first, get the schema (schema is a child of the qri structure component)
  # parse the json, schema will be a nested list
  structure <- system2('qri', args = str_interp('get structure ${datasetReference} --format json'), stdout = TRUE) %>% 
    parse_json()
  
  # next, map the jsonSchema types into col_types
  # types is a string of letter abbreviations for column types (character = c, integer = i, etc)
  # for example, if the dataset had 2 string columns, 3 number columns, and 1 integer column, types would be "ccdddi"
  types <- paste(map_chr(structure$schema$items$items, function(d) { return(mapType(d$type)) }), collapse = '')
  
  # now that we have a string of column types, we can use read_csv() to import the dataframe
  # to actually get the CSV string, we use system2() to call qri get ...
  # bear in mind that qri doesn't enforce column types unless you ask it to, so it's possible that the
  # values in the dataset's body may not match the dataset's schema
  df = read_csv(
    system2('qri', args=str_interp('get body ${datasetReference}'), stdout = TRUE),
    col_names = TRUE,
    col_types = types
  )
  return(df)
}

# I already have a qri dataset in my local qri repo (nyc-transit-data/turnstile_daily_counts_2020)
# to load this dataset on your machine, install qri CLI and then run `qri pull nyc-transit-data/turnstile_daily_counts_2020`
# let's load it into a dataframe
turnstile_counts_2020 <- getQriDataset('nyc-transit-data/turnstile_daily_counts_2020')

# neat.  How many entries were there at Atlantic Ave Barclays Center the week of August 30 - September 5?
barclays_aug30_week <- filter(turnstile_counts_2020, complex_id == '617', date >= '2020-08-30', date <= '2020-09-05')

# let's make a simple chart to visualize the entries and exits over the course of the week
fig <- plot_ly(
  barclays_aug30_week,
  x = ~date,
  y = ~entries,
  type = 'scatter',
  mode = 'lines',
  name = 'entries',
  line = list(color = 'rgb(205, 12, 24)', width = 4)
) %>%
  
  add_trace(y = ~exits, name = 'exits', line = list(color = 'rgb(22, 96, 167)', width = 4)) %>%
  
  layout(
    title = "Daily Entries and Exits - Atlantic Ave/Barclays Center Station Complex",
    xaxis = list(
      title = "Date",
      type = 'date',
      tickformat = '%d %B (%a)'
    ),
    yaxis = list(
      title = "Count",
      range = c(0, 15000)
    ))

fig

