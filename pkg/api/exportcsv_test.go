package api

import (
	"math"
	"testing"
)

func compareRows(rowsA []Row, rowsB []Row) bool {
	if len(rowsA) != len(rowsB) {
		return false
	}
	for i, _ := range rowsA {
		if rowsA[i].Time != rowsB[i].Time {
			return false
		}
		if len(rowsA[i].Values) != len(rowsB[i].Values) {
			return false
		}
		for j, _ := range rowsA[i].Values {
			if rowsA[i].Values[j] != rowsB[i].Values[j] {
				if !(math.IsNaN(rowsA[i].Values[j]) && math.IsNaN(rowsB[i].Values[j])) {
					return false
				}
			}
		}
	}
	return true
}

type testcase struct {
	Name     string
	Input    [][]Point
	Expected []Row
}

var tests = []testcase{
	{
		"Empty series",
		[][]Point{
			[]Point{},
		},
		[]Row{},
	},
	{
		"Three empty series",
		[][]Point{
			[]Point{},
			[]Point{},
			[]Point{},
		},
		[]Row{},
	},
	{
		"Single series",
		[][]Point{
			[]Point{
				Point{1473842792837738370, 1.0},
				Point{1473842793973036635, 1.1},
				Point{1473842795105317504, 1.2},
			},
		},
		[]Row{
			Row{1473842792837738370, []float64{1.0}},
			Row{1473842793973036635, []float64{1.1}},
			Row{1473842795105317504, []float64{1.2}},
		},
	},
	{
		"Two aligned series",
		[][]Point{
			[]Point{
				Point{1473842792837738370, 1.0},
				Point{1473842793973036635, 1.1},
				Point{1473842795105317504, 1.2},
			},
			[]Point{
				Point{1473842792837738370, 2.0},
				Point{1473842793973036635, 2.1},
				Point{1473842795105317504, 2.2},
			},
		},
		[]Row{
			Row{1473842792837738370, []float64{1.0, 2.0}},
			Row{1473842793973036635, []float64{1.1, 2.1}},
			Row{1473842795105317504, []float64{1.2, 2.2}},
		},
	},
	{
		"Two offset series",
		[][]Point{
			[]Point{
				Point{1473842792837738370, 1.0},
				Point{1473842793973036635, 1.1},
				Point{1473842795105317504, 1.2},
			},
			[]Point{
				Point{1473842793973036635, 2.1},
				Point{1473842795105317504, 2.2},
				Point{1473842796226293423, 2.3},
			},
		},
		[]Row{
			Row{1473842792837738370, []float64{1.0, math.NaN()}},
			Row{1473842793973036635, []float64{1.1, 2.1}},
			Row{1473842795105317504, []float64{1.2, 2.2}},
			Row{1473842796226293423, []float64{math.NaN(), 2.3}},
		},
	},
	{
		"Two offset series without overlap",
		[][]Point{
			[]Point{
				Point{1473842792837738370, 1.0},
				Point{1473842793973036635, 1.1},
				Point{1473842795105317504, 1.2},
			},
			[]Point{
				Point{1473842796226293423, 2.3},
				Point{1473842797352452350, 2.4},
				Point{1473842798470193099, 2.5},
			},
		},
		[]Row{
			Row{1473842792837738370, []float64{1.0, math.NaN()}},
			Row{1473842793973036635, []float64{1.1, math.NaN()}},
			Row{1473842795105317504, []float64{1.2, math.NaN()}},
			Row{1473842796226293423, []float64{math.NaN(), 2.3}},
			Row{1473842797352452350, []float64{math.NaN(), 2.4}},
			Row{1473842798470193099, []float64{math.NaN(), 2.5}},
		},
	},
	{
		"Three offset series",
		[][]Point{
			[]Point{
				Point{1473842792837738370, 1.0},
				Point{1473842793973036635, 1.1},
				Point{1473842795105317504, 1.2},
			},
			[]Point{
				Point{1473842793973036635, 2.1},
				Point{1473842795105317504, 2.2},
				Point{1473842796226293423, 2.3},
			},
			[]Point{},
		},
		[]Row{
			Row{1473842792837738370, []float64{1.0, math.NaN(), math.NaN()}},
			Row{1473842793973036635, []float64{1.1, 2.1, math.NaN()}},
			Row{1473842795105317504, []float64{1.2, 2.2, math.NaN()}},
			Row{1473842796226293423, []float64{math.NaN(), 2.3, math.NaN()}},
		},
	},
}

func TestAlign(t *testing.T) {
	for _, test := range tests {
		output := Align(test.Input)
		if !compareRows(output, test.Expected) {
			t.Error(test.Name, " expected: ", test.Expected, " got: ", output)
		}
	}
}
