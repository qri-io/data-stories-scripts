# covid19-nyc-311

A jupyter notebook that pulls data for January 1 through March 17th and iterates over complaint types to create a chart of daily call volume.

[Blog post](https://medium.com/qri-io/consumer-noise-housing-complaints-on-the-rise-as-covid-19-hits-nyc-and-other-early-trends-1955aa3207fe)


## API Call for the data
https://data.cityofnewyork.us/resource/fhrw-4uyv.json?$where=created_date between '2020-01-01T00:00:00' and '2020-03-19T00:00:00'&$order=created_date desc&$limit=10
