package store

import (
	"strings"
	"time"

	"database/sql/driver"

	"github.com/flarco/dbio/database"
	"github.com/flarco/dbio/iop"
	"github.com/flarco/g"
	"github.com/jmoiron/sqlx"
	"github.com/spf13/cast"
	"gopkg.in/yaml.v2"
)

// SchemaTable represent a schema table/view
type SchemaTable struct {
	Conn       string    `json:"conn" gorm:"primaryKey"`
	Database   string    `json:"database"  gorm:"primaryKey"`
	SchemaName string    `json:"schema_name" gorm:"primaryKey"`
	TableName  string    `json:"table_name" gorm:"primaryKey"`
	IsView     bool      `json:"is_view"`
	NumRows    int64     `json:"num_rows"`
	UpdatedDt  time.Time `json:"updated_dt" gorm:"autoUpdateTime"`
}

// TableColumn is a table/view column
type TableColumn struct {
	Conn        string    `json:"conn" gorm:"primaryKey"`
	Database    string    `json:"database"  gorm:"primaryKey"`
	SchemaName  string    `json:"schema_name" gorm:"primaryKey"`
	TableName   string    `json:"table_name" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"primaryKey"`
	ID          int       `json:"id"`
	Type        string    `json:"type"`
	Precision   int       `json:"precision"`
	Scale       int       `json:"scale"`
	NumRows     int64     `json:"num_rows"`
	NumDistinct int64     `json:"num_distinct"`
	NumNulls    int64     `json:"num_nulls"`
	MinLen      int       `json:"min_len"`
	MaxLen      int       `json:"max_len"`
	UpdatedDt   time.Time `json:"updated_dt" gorm:"autoUpdateTime"`
}

type QueryStatus string

const QueryStatusCompleted QueryStatus = "completed"
const QueryStatusFetched QueryStatus = "fetched"
const QueryStatusCancelled QueryStatus = "cancelled"
const QueryStatusErrorred QueryStatus = "errorred"
const QueryStatusSubmitted QueryStatus = "submitted"

type Headers []string

// Scan scan value into Jsonb, implements sql.Scanner interface
func (h *Headers) Scan(value interface{}) error {
	return g.JSONScanner(h, value)
}

// Value return json value, implement driver.Valuer interface
func (h Headers) Value() (driver.Value, error) {
	return g.JSONValuer(h, "[]")
}

type Rows [][]interface{}

// Scan scan value into Jsonb, implements sql.Scanner interface
func (r *Rows) Scan(value interface{}) error {
	return g.JSONScanner(r, value)
}

// Value return json value, implement driver.Valuer interface
func (r Rows) Value() (driver.Value, error) {
	return g.JSONValuer(r, "[]")
}

// Query represents a query
type Query struct {
	ID        string        `json:"id" query:"id" gorm:"primaryKey"`
	Conn      string        `json:"conn" query:"conn" gorm:"index"`
	Database  string        `json:"database" query:"database" gorm:"index"`
	Tab       string        `json:"tab" query:"tab"`
	Text      string        `json:"text" query:"text"`
	Time      int64         `json:"time" query:"time" gorm:"index:idx_query_time"`
	Duration  float64       `json:"duration" query:"duration"`
	Status    QueryStatus   `json:"status" query:"status"`
	Err       string        `json:"err" query:"err"`
	Headers   Headers       `json:"headers" query:"headers" gorm:"headers"`
	Rows      Rows          `json:"rows" query:"rows" gorm:"rows"`
	Context   g.Context     `json:"-" gorm:"-"`
	Result    *sqlx.Rows    `json:"-" gorm:"-"`
	Columns   []iop.Column  `json:"-" gorm:"-"`
	Limit     int           `json:"limit" query:"limit" gorm:"-"`
	Wait      bool          `json:"wait" query:"wait" gorm:"-"`
	UpdatedDt time.Time     `json:"-" gorm:"autoUpdateTime"`
	Done      chan struct{} `json:"-" gorm:"-"`
}

// Session represents a connection session
type Session struct {
	Conn      string    `gorm:"primaryKey"`
	Name      string    `gorm:"primaryKey"`
	Data      g.Map     `json:"data" gorm:"type:json not null default '{}'"`
	CreatedDt time.Time `json:"created_dt" gorm:"autoCreateTime"`
	UpdatedDt time.Time `json:"updated_dt" gorm:"autoUpdateTime"`
}

// TrimRows keeps a number of rows
func (q *Query) TrimRows(n int) {
	// only store n rows
	if len(q.Rows) > n {
		q.Rows = q.Rows[0:n]
	}
}

// Pulled returns true if rows are pulled
func (q *Query) Pulled() bool {
	return q.Status == QueryStatusCompleted || q.Status == QueryStatusFetched
}

// Submit submits the query
func (q *Query) Submit(conn database.Connection) (err error) {
	defer Sync("queries", q)
	defer func() { q.Done <- struct{}{} }()

	setError := func(err error) {
		q.Status = QueryStatusErrorred
		q.Err = g.ErrMsg(err)
		q.Duration = (float64(time.Now().UnixNano()/1000000) - float64(q.Time)) / 1000
	}

	if q.Limit == 0 {
		q.Limit = 100
	}

	q.Text = strings.TrimSuffix(q.Text, ";")

	err = q.ProcessCustomReq(conn)
	if err != nil {
		setError(err)
		err = g.Error(err, "could not process custom request")
		return
	}

	q.Status = QueryStatusSubmitted
	q.Context = g.NewContext(conn.Context().Ctx)

	Sync("queries", q)

	g.Debug("submitting %s\n%s\n---------------------------------------------------------------------", q.ID, q.Text)
	q.Result, err = conn.Db().QueryxContext(q.Context.Ctx, q.Text)
	if err != nil {
		setError(err)
		err = g.Error(err, "could not execute query")
		return
	}

	colTypes, err := q.Result.ColumnTypes()
	if err != nil {
		setError(err)
		err = g.Error(err, "result.ColumnTypes()")
		return
	}

	q.Columns = database.SQLColumns(colTypes, conn.Template().NativeTypeMap)

	return
}

// ProcessCustomReq looks at the text for yaml parsing
func (q *Query) ProcessCustomReq(conn database.Connection) (err error) {

	// see if analysis req
	if strings.HasPrefix(q.Text, "/*@") && strings.HasSuffix(q.Text, "@*/") {
		// is data request in yaml or json
		// /*@{"analysis":"field_count", "data": {...}} @*/
		// /*@{"metadata":"ddl_table", "data": {...}} @*/
		type analysisReq struct {
			Analysis string                 `json:"analysis" yaml:"analysis"`
			Metadata string                 `json:"metadata" yaml:"metadata"`
			Data     map[string]interface{} `json:"data" yaml:"data"`
		}

		req := analysisReq{}
		body := strings.TrimSuffix(strings.TrimPrefix(q.Text, "/*@"), "@*/")
		err = yaml.Unmarshal([]byte(body), &req)
		if err != nil {
			err = g.Error(err, "could not parse yaml/json request")
			return
		}

		sql := ""
		switch {
		case req.Analysis != "":
			sql, err = conn.GetAnalysis(req.Analysis, req.Data)
		case req.Metadata != "":
			template, ok := conn.Template().Metadata[req.Metadata]
			if !ok {
				err = g.Error("metadata key '%s' not found", req.Metadata)
			}
			sql = g.Rm(template, req.Data)
		}

		if err != nil {
			err = g.Error(err, "could not execute query")
			return
		}

		q.Text = q.Text + "\n\n" + sql
	}
	return
}

// FetchRows returns a dataset based on a number of rows
func (q *Query) FetchRows() (data iop.Dataset, err error) {
	if q.Err != "" {
		err = g.Error(q.Err)
		return
	}

	data = iop.NewDataset(q.Columns)

	nextFunc := func(it *iop.Iterator) bool {
		if q.Limit > 0 && it.Counter >= cast.ToUint64(q.Limit) {
			q.Status = QueryStatusFetched
			return false
		}

		next := q.Result.Next()
		if next {
			// add row
			it.Row, err = q.Result.SliceScan()
			if err != nil {
				it.Context.CaptureErr(g.Error(err, "failed to scan"))
			} else {
				return true
			}
		}

		// if any error occurs during iteration
		if q.Result.Err() != nil || it.Context.Err() != nil {
			q.Context.Cancel()
			it.Context.CaptureErr(g.Error(q.Result.Err(), "error during iteration"))
		}

		q.Status = QueryStatusCompleted
		return false
	}

	ds := iop.NewDatastreamIt(q.Context.Ctx, q.Columns, nextFunc)
	ds.NoTrace = true
	ds.Inferred = true

	err = ds.Start()
	if err != nil {
		q.Context.Cancel()
		err = g.Error(err, "could start datastream")
		return
	}

	data, err = ds.Collect(q.Limit)
	if err != nil {
		q.Context.Cancel()
		err = g.Error(err, "could not collect data")
		return
	}

	return
}

func (q *Query) ProcessResult() (result map[string]interface{}, err error) {
	if q.Err != "" {
		err = g.Error(q.Err)
		return
	}

	// fetch rows
	data, err := q.FetchRows()
	if err != nil {
		err = g.Error(err, "could not fecth rows")
		return
	}

	q.Duration = (float64(time.Now().UnixNano()/1000000) - float64(q.Time)) / 1000
	q.Headers = data.Columns.Names()
	q.Rows = data.Rows

	result = g.ToMap(q)

	q.TrimRows(100) // only store 100 rows in sqlite
	Sync("queries", q)

	q.TrimRows(1) // only store 1 row in mem

	return
}
