library(tidyverse)
library(scales)
library(sf)
library(svglite)

# import the csv
raw <- read_csv('/Users/chriswhong/Sites/data-stories-scripts/nyc-capital-projects/scraper/csv/combined.csv')

# hand-jam a dataframe of borough populations so we can normalize things if we want to later
population <- frame_data(
  ~borough, ~pop_estimate_2019,
  "BRONX", 1418207,
  "BROOKLYN", 2559903,
  "MANHATTAN", 1628706,
  "QUEENS", 2253858,
  "RICHMOND", 476143,
  "CITYWIDE", 8336817
)

# calculate per-capital totals
boroughs <- group_by(raw, borough) %>% summarize(prior_actuals = sum(combined_prior_actuals), planned_spending = sum(combined_total)) %>% 
  left_join(population, by='borough') %>% 
  mutate(
    prior_actuals_per_capita = (prior_actuals / pop_estimate_2019),
    planned_spending_per_capita = (planned_spending / pop_estimate_2019)
  )

# totals for the whole dataset
grand_total <- sum(raw$combined_total) #105.8 Billion
grand_prior_actuals <- sum(raw$combined_prior_actuals) #40.9 Billion
grand_planned_spending <- grand_total - grand_prior_actuals #64.9 Billion

# breakdown for each borough + citywide
by_borough <- group_by(raw, borough) %>% summarize(
  combined_total = sum(combined_total),
  combined_prior_actuals = sum(combined_prior_actuals)
) %>% mutate(combined_planned_spending = combined_total - combined_prior_actuals) %>%
  mutate(
    combined_prior_actuals = paste('$', label_number_si(accuracy=0.1)(combined_prior_actuals * 1000), sep=''),
    combined_planned_spending = paste('$', label_number_si(accuracy=0.1)(combined_planned_spending * 1000), sep=''),
    combined_total = paste('$', label_number_si(accuracy=0.1)(combined_total * 1000), sep='')
  )

# a list of excluded community districts (I think these mean boroughwide, or citywide for 000 and 099)
excludedCommunityDistricts = c("000", "099", "100", "199", "200", "299", "300", "399", "400", "499", "500")

# given a space-delimited community districts string, determine if there is at least one local district
checkIfLocal <- function(communityBoardsServed) {
  print(communityBoardsServed)
  if (communityBoardsServed == "" || is.na(communityBoardsServed)) return(F) 

  parts <- str_split(communityBoardsServed, ' ')
  hasExcludedCd <- str_detect(communityBoardsServed, excludedCommunityDistricts)
  excludedCount <- length(hasExcludedCd[hasExcludedCd==TRUE])

  localCount <- lengths(parts) - excludedCount
  print(localCount > 0)
  
  return(localCount > 0)
}

# necessary to use the custom function above in mutate()
v_checkIfLocal <- Vectorize(checkIfLocal) 

# to get a rough idea of boroughwide vs community-specific, call any project with at least one CD identified in community_board_served as not boroughwide
boroughs <- filter(raw, borough != 'CITYWIDE') %>%
mutate(
  is_local = v_checkIfLocal(community_boards_served)
) %>%
group_by(borough, is_local) %>% summarize(
  combined_total = sum(combined_total),
  combined_prior_actuals = sum(combined_prior_actuals)
) %>% mutate(combined_planned_spending = combined_total - combined_prior_actuals) %>%
  mutate(
    combined_prior_actuals = combined_prior_actuals * 1000,
    combined_planned_spending = combined_planned_spending * 1000,
    combined_total = combined_total * 1000
  ) %>% pivot_wider(
    id_cols=borough,
    names_from = is_local,
    values_from = combined_total
  ) %>% rename(c("boroughwide"="FALSE", "local"="TRUE"))

write_csv(boroughs, '/Users/chriswhong/Desktop/boroughwide.csv')


# prettify by multiplying by 1000 and using label_number_si to abbreviate
pretty_boroughs <- mutate(
  boroughs,
  prior_actuals=label_number_si(accuracy=0.1)(prior_actuals * 1000),
  planned_spending=label_number_si(accuracy=0.1)(planned_spending * 1000),
  prior_actuals_per_capita=label_number_si(accuracy=0.1)(prior_actuals_per_capita * 1000),
  planned_spending_per_capita=label_number_si(accuracy=0.1)(planned_spending_per_capita * 1000)
)


# analysis of one community district (mine), Brooklyn 6

cd6 <- filter(raw, grepl("306",community_boards_served))
write_csv(cd6, '/Users/chriswhong/Desktop/cd6.csv')

cd6_total <- sum(cd6$combined_total) # 480.9M

# analysis of one community district 208

bx8 <- filter(raw, grepl("208",community_boards_served)) %>% select('project_description', 'combined_total')

# let's just get combined_total for every community district in NYC
# asterisk - this will not split costs for projects with more that one cd served

# first we need to split every row with multiple projects into multiple rows with a single project
separated = separate_rows(raw, community_boards_served, sep = " ")


# group by and summarize
community_board_summary <- group_by(separated, community_boards_served) %>%
  summarize(num_projects=n(), combined_total=sum(combined_total) * 1000 ) %>%
  filter(!(community_boards_served %in% excludedCommunityDistricts), !is.na(community_boards_served))

write_csv(community_board_summary, '/Users/chriswhong/Desktop/capitalprojects/community_board_summary.csv')

# group by and summarize on community board and total spend

community_board_category_summary <- group_by(separated, community_boards_served, ten_year_plan_category, .drop=FALSE) %>%
  summarize(num_projects=n(), combined_total=sum(combined_total) * 1000 ) %>%
  filter(!(community_boards_served %in% excludedCommunityDistricts), !is.na(community_boards_served)) %>% 
  ungroup()

# get the totals for each category, which we will use in labeling the facets in the facet_wrap
category_totals <- group_by(community_board_category_summary, ten_year_plan_category) %>%
  summarize(category_total=sum(combined_total) ,category_total_label = paste('$', label_number_si(accuracy=0.1)(sum(combined_total)), sep = "")) %>%
  mutate(
    ten_year_plan_category_label = paste(ten_year_plan_category, ' | ',category_total_label, sep='')
  )

# us complete to fill in each combination, so that every district is mappable for every category whether it has data or not
all_combinations <- complete(community_board_category_summary, community_boards_served, ten_year_plan_category)

# thanks to https://timogrossenbacher.ch/2016/12/beautiful-thematic-maps-with-ggplot2-only/#a-better-color-scale
# for a wonderful example
labels <- c('< $1M', '$1M-10M', '$10M-100M' ,'$100M-500M', '> $500M')
pretty_breaks <- c(0, 1000000,10000000,100000000,500000000, max(all_combinations$combined_total, na.rm = T))

# cut the dataframe into breaks
all_combinations$breaks <- cut(all_combinations$combined_total, 
      breaks = pretty_breaks, 
      include.lowest = TRUE, 
      labels = labels)


# small multiples for each ten_year_plan_category
cds <- read_sf('/Users/chriswhong/Sites/data-stories-scripts/nyc-capital-projects/analysis/data/community_districts/community_districts.shp') %>%
  mutate(boro_cd_string = toString(boro_cd)) %>%
  left_join(all_combinations, by=c('borocdstr' = 'community_boards_served'))

# join with the totals for labeling
cds <- left_join(cds, category_totals, by='ten_year_plan_category')

# limit to smaller number of categories for testing, because doing the whole thing takes a long time
cds <- filter(
  cds,
  ten_year_plan_category %in% c(
    'PROGRAMMATIC RESPONSE TO REGULATORY MANDATES',
    'LAND ACQUISITION AND TREE PLANTING',
    'REHABILITATION OF CITY-OWNED OFFICE SPACE',
    'POLICE FACILITIES')
  )

# facet wrap of little adorable choropleth maps
cds %>%
  ggplot() +
  geom_sf(aes(fill = breaks), color = "#cccccc", size = 0.05) +
  theme_void() + 
  facet_wrap(facets=~fct_reorder(ten_year_plan_category_label, category_total, .desc = TRUE), labeller = label_wrap_gen(width=20), ncol=8) + 
  scale_fill_manual(
    breaks=levels(cds$breaks),
    values=c('#bdd7e7', '#9ecae1', '#6baed6', '#3182bd', '#2171b5'),
    na.value = "#f7f7f7"
  ) +
  theme(strip.text.x = element_text(size = 3.5))

ggsave("/Users/chriswhong/Desktop/facet.pdf", width = 12, height = 12)



