CREATE TABLE stations
(
  id serial NOT NULL,
  ogc_fid integer,
  "station id" integer,
  "complex id" character varying(5),
  "gtfs stop id" character varying(5),
  division character varying(5),
  "line" character varying(40),
  "stop name" character varying(255),
  borough character varying(2),
  "daytime routes" character varying(20),
  structure character varying(20),
  "gtfs latitude" decimal,
  "gtfs longitude" decimal,
  "north direction label" character varying(255),
  "south direction label" character varying(255),
  CONSTRAINT stations_pkey PRIMARY KEY (id)
);

\set localpath `pwd`'/../lookup/stations.csv'
COPY stations(ogc_fid,"station id","complex id","gtfs stop id",division,"line","stop name",borough,"daytime routes",structure,"gtfs latitude","gtfs longitude","north direction label","south direction label")
FROM :'localpath' DELIMITER ',' CSV HEADER;