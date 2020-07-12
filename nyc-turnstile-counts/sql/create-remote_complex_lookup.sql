CREATE TABLE remote_complex_lookup
(
  id serial NOT NULL,
  remote character varying(5),
  booth character varying(10),
  complex_id character varying(5),
  station character varying(50),
  line_name character varying(20),
  division character varying(5)
);

\set localpath `pwd`'/../lookup/remote_complex_lookup.csv'
COPY remote_complex_lookup(remote,booth,complex_id,station,line_name,division)
FROM :'localpath' DELIMITER ',' CSV HEADER;