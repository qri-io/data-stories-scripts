"""Extract park information from
https://www.parks.ca.gov/parkindex
to generate body.csv and structure.json"""


load("http.star", "http")
load("encoding/csv.star", "csv")
load("encoding/json.star", "json")
load("re.star", "re")
load("bsoup.star", "bsoup")


def download(ctx):
    res = http.get("https://www.parks.ca.gov/parkindex")

    # local, for testing
    # res = http.get("http://localhost:8000/parkindex")
    return res.body()


# starlark dict order is non-deterministic(?)
# docs say it is deterministic
keyorderunlabled = [
    "long_name",
    "type_desc",
    "District",
    "County",
    "Region",
    "Latitude",
    "Longitude",
    "page_id",
    "lvl_id",
    "81",
    "82",
    "83",
    "84",
    "85",
    "86",
    "87",
    "89",
    "90",
    "91",
    "92",
    "93",
    "94",
    "95",
    "96",
    "97",
    "98",
    "99",
    "100",
    "101",
    "102",
    "103",
    "104",
    "105",
    "106",
    "107",
    "108",
    "109",
    "110",
    "111",
    "112",
    "113",
    "114",
    "115",
    "116",
    "117",
    "118",
    "119",
    "120",
    "121",
    "122",
    "123",
    "124",
    "125",
    "126",
    "city_name",
]

stringfields = ["long_name", "type_desc", "District", "County", "Region", "city_name"]

# transform is a special function called automatically by Qri if defined
def transform(ds, ctx):
    parkindex = ctx.download

    # Parse labels for checkbox values

    nodes = bsoup.parseHtml(parkindex)
    nodes = nodes.find_all("label")

    label = {}

    for i in nodes:
        for_ = i.attrs().get("for")
        if not for_:
            continue
        label[for_] = i.get_text()

    # Parse data out of JSON
    jsonblobhits = re.findall("var vParksJson = .*;", parkindex)

    if len(jsonblobhits) != 1:
        error("Wrong number of vParksJson’s")

    # there is no `re.findall.group()`, so we have to process further
    jsonblob = re.findall(r"\[.*]", jsonblobhits[0])[0]

    parsed = json.loads(jsonblob)

    # construct dataset structure

    # `get(key, key)` labels all keys that are in
    # `label` otherwise, they keep their old label
    st = structure([label.get(key, key) for key in keyorderunlabled])
    ds.set_structure(st)

    # convert back to csv data without header row
    # `write_all` returns a string
    csvstring = csv.write_all([[i[k] for k in keyorderunlabled] for i in parsed])

    ds.set_body(csvstring, parse_as="csv")


# structure is a custom function for extracting a dataset structure.
# we need this this because Qri doesn't guess the schema correctly for us
# so we build one by hand
def structure(header_row):
    items = [{"title": title, "type": "string"} for title in header_row]

    for i in items:
        # xxx Some of the int fields are bools
        # xxx which would require parsing and conversion
        if i["title"] not in stringfields:
            i["type"] = "integer"
        if i["title"] in ("Latitude", "Longitude"):
            i["type"] = "number"

    return {
        "format": "csv",
        "formatConfig": {"lazyQuotes": True, "headerRow": True},
        "schema": {"type": "array", "items": {"type": "array", "items": items}},
    }
