package api

import (
	"encoding/csv"
	"encoding/json"
	"io"
	"math"
	"strconv"
	"time"

	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/log"
	"github.com/grafana/grafana/pkg/middleware"
	m "github.com/grafana/grafana/pkg/models"
	influxdb "github.com/influxdata/influxdb/client/v2"
)

type QueryRequest struct {
	Measurement    string `json:"measurement,omitempty"`
	Query          string `json:"query"`
	DataSourceName string `json:"datasource"` // i couldn't get datasourceId client side
	OrgId          int64  `json:"org"`
}

type QueryResult struct {
	Measurement string
	Result      string
}

type Point struct {
	Time  int64
	Value float64
}

type Row struct {
	Time   int64
	Values []float64
}

// Align a two-dimensional array of Points and on their Time.
// Each array of Points needs to be sorted by Time in ascending order.
func Align(series [][]Point) []Row {
	log.Debug("align")
	rows := make([]Row, 0)
	for {
		var time int64 = math.MaxInt64
		hasElems := len(series)
		for _, values := range series {
			if len(values) == 0 {
				hasElems -= 1
				continue
			}
			if values[0].Time < time {
				time = values[0].Time
			}
		}
		if hasElems == 0 {
			break
		}
		var row Row
		row.Time = time
		row.Values = make([]float64, len(series))
		for i, _ := range row.Values {
			row.Values[i] = math.NaN()
		}
		for i, values := range series {
			if len(values) == 0 {
				continue
			}
			if values[0].Time == time {
				row.Values[i] = values[0].Value
				series[i] = values[1:]
			}
		}
		rows = append(rows, row)
	}
	return rows
}

func queryInfluxDB(query string, ds *m.DataSource) ([]Point, error) {
	log.Debug("queryInfluxDB")
	client, err := influxdb.NewHTTPClient(influxdb.HTTPConfig{
		Addr:     ds.Url,
		Username: ds.User,
		Password: ds.Password,
	})
	if err != nil {
		return make([]Point, 0), err
	}
	defer client.Close()

	response, err := client.Query(influxdb.NewQuery(query, ds.Database, "ns"))
	if err != nil {
		return make([]Point, 0), err
	}
	if response.Error() != nil {
		return make([]Point, 0), response.Error()
	}
	// apparently this is not an error
	if len(response.Results[0].Series) == 0 {
		return make([]Point, 0), nil
	}
	points := make([]Point, len(response.Results[0].Series[0].Values))
	for i, point := range response.Results[0].Series[0].Values {
		points[i].Time, _ = point[0].(json.Number).Int64()
		points[i].Value, _ = point[1].(json.Number).Float64()
	}
	return points, nil
}

func writeCSV(header []string, rows []Row, w io.Writer) {
	csvWriter := csv.NewWriter(w)
	csvWriter.Write(header)
	for _, row := range rows {
		formattedRow := make([]string, len(row.Values)+1)
		formattedRow[0] = time.Unix(0, row.Time).UTC().Format("2006-01-02T15:04:05.000Z")
		for i, value := range row.Values {
			if math.IsNaN(value) {
				formattedRow[i+1] = ""
			} else {
				formattedRow[i+1] = strconv.FormatFloat(value, 'f', -1, 64)
			}
		}
		csvWriter.Write(formattedRow)
	}
	csvWriter.Flush()
}

/*
ExportCSV returns the query results as CSV aligned by Time. Only InfluxDB is supported.
Requests needs to be POSTed as JSON (see also type QueryRequest struct).
    [
        {
            "measurement": "LoadUp",
            "query": "SELECT \"value\" FROM \"LoadUp\" WHERE time >= 1392678000000ms AND time <= 1394838000000ms",
            "datasource": "influxdb",
            "org": 1
        }
    ]
*/
func ExportCSV(c *middleware.Context) {
	log.Debug("ExportCSV")
	queryRequestsJson, err := c.Req.Body().Bytes()
	if err != nil {
		c.JsonApiErr(500, "Failed to get request body as bytes", err)
		return
	}
	queryRequests := make([]QueryRequest, 0)
	err = json.Unmarshal(queryRequestsJson, &queryRequests)
	if err != nil {
		c.JsonApiErr(400, "Failed to unmarshal json", err)
		return
	}
	series := make([][]Point, 0)
	header := []string{"Time"}
	for _, request := range queryRequests {
		dsQuery := m.GetDataSourceByNameQuery{
			Name:  request.DataSourceName,
			OrgId: request.OrgId,
		}
		if err := bus.Dispatch(&dsQuery); err != nil {
			if err == m.ErrDataSourceNotFound {
				c.JsonApiErr(404, "Data source not found", nil)
				return
			}
			c.JsonApiErr(500, "Failed to query datasources", err)
			return
		}
		ds := dsQuery.Result
		if ds.Type == "influxdb" {
			header = append(header, request.Measurement)
			oneSeries, err := queryInfluxDB(request.Query, ds)
			if err != nil {
				c.JsonApiErr(500, err.Error(), err)
				return
			}
			series = append(series, oneSeries)
		}
	}
	rows := Align(series)
	c.Resp.Header().Set("Content-Type", "text/csv")
	writeCSV(header, rows, c.Resp)
}
