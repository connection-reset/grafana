Export values from all measurements in all panels without aggregation in the current time span as CSV.
Currently really slow since every measurement is queried on its own and the CSV is generated client side, which includes aligning all value arrays on timestamp.

Only InfluxDB is supported.