package store

import (
	"encoding/json"
	"strings"
	"time"

	"database/sql/driver"

	"github.com/flarco/dbio/database"
	"github.com/flarco/dbio/iop"
	"github.com/flarco/g"
	"github.com/jmoiron/sqlx"
	"github.com/slingdata-io/sling/core/sling"
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
	TableIsView bool      `json:"table_is_view"`
	Name        string    `json:"column_name" gorm:"primaryKey"`
	ID          int       `json:"column_id"`
	Type        string    `json:"column_type"`
	Precision   int       `json:"column_precision"`
	Scale       int       `json:"column_scale"`
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

type Row []interface{}

// Scan scan value into Jsonb, implements sql.Scanner interface
func (r *Row) Scan(value interface{}) error {
	return g.JSONScanner(r, value)
}

// Value return json value, implement driver.Valuer interface
func (r Row) Value() (driver.Value, error) {
	return g.JSONValuer(r, "[]")
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
	Rows      Rows          `json:"rows" query:"rows" gorm:"-"`
	Context   g.Context     `json:"-" gorm:"-"`
	Result    *sqlx.Rows    `json:"-" gorm:"-"`
	Columns   []iop.Column  `json:"-" gorm:"-"`
	Limit     int           `json:"limit" query:"limit" gorm:"-"` // -1 is unlimited
	Wait      bool          `json:"wait" query:"wait" gorm:"-"`
	UpdatedDt time.Time     `json:"-" gorm:"autoUpdateTime"`
	Done      chan struct{} `json:"-" gorm:"-"`
	Affected  int64         `json:"affected" gorm:"-"`
	ProjDir   string        `json:"proj_dir" gorm:"-"`
}

// Job represents a job
type Job struct {
	ID        string           `json:"id" gorm:"primaryKey"`
	Type      string           `json:"type" gorm:"index:idx_job_type"`
	Request   g.Map            `json:"request" gorm:"type:json default '{}'"`
	Time      int64            `json:"time" gorm:"index:idx_job_time"`
	Duration  float64          `json:"duration"`
	Status    sling.ExecStatus `json:"status"`
	Err       string           `json:"err"`
	Result    g.Map            `json:"result" gorm:"type:json default '{}'"`
	UpdatedDt time.Time        `json:"updated_dt" gorm:"autoUpdateTime"`

	Context g.Context     `json:"-" gorm:"-"`
	Task    *sling.Task   `json:"-" gorm:"-"`
	Wait    bool          `json:"wait" gorm:"-"`
	Done    chan struct{} `json:"-" gorm:"-"`
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

	if q.Limit == 0 || q.Limit > 5000 {
		q.Limit = 5000
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

	sqls := database.ParseSQLMultiStatements(q.Text)
	if len(sqls) == 1 {
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
			return err
		}

		q.Columns = database.SQLColumns(colTypes, conn.Template().NativeTypeMap)
	} else {
		tx, err := conn.NewTransaction(q.Context.Ctx)
		if err != nil {
			setError(err)
			err = g.Error(err, "could not start transaction")
			return err
		}

		defer tx.Rollback()
		res, err := tx.ExecMultiContext(q.Context.Ctx, q.Text)
		if err != nil {
			setError(err)
			err = g.Error(err, "could not execute queries")
			return err
		}
		err = tx.Commit()
		if err != nil {
			setError(err)
			err = g.Error(err, "could not commit")
			return err
		}

		q.Affected, _ = res.RowsAffected()
	}

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

// ResultStream returns the query result as a datastream
func (q *Query) ResultStream() (ds *iop.Datastream, err error) {
	if q.Err != "" {
		err = g.Error(q.Err)
		return
	}

	nextFunc := func(it *iop.Iterator) bool {
		if q.Limit > 0 && it.Counter >= cast.ToUint64(q.Limit) {
			q.Status = QueryStatusCompleted
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

	ds = iop.NewDatastreamIt(q.Context.Ctx, q.Columns, nextFunc)
	ds.NoTrace = true
	ds.Inferred = true

	err = ds.Start()
	if err != nil {
		q.Context.Cancel()
		err = g.Error(err, "could start datastream")
		return
	}

	return
}

// Close closes and cancels the query
func (q *Query) Close(cancel bool) {
	if cancel {
		q.Context.Cancel()
	}
	if q.Result != nil {
		q.Result.Close()
	}
}

// ProcessResult fetches all rows in query and stores in sqlite
// for further retrieval
func (q *Query) ProcessResult() (result map[string]interface{}, err error) {
	if q.Err != "" {
		err = g.Error(q.Err)
		return g.ToMap(q), err
	}

	if q.Affected == -1 {
		ds, err := q.ResultStream()
		if err != nil {
			err = g.Error(err, "could not fetch result rows")
			return g.ToMap(q), err
		}

		// retrieve rows
		data, err := ds.Collect(q.Limit)
		if err != nil {
			err = g.Error(err, "could not retrieve rows")
			return g.ToMap(q), err
		}

		if len(data.Rows) == q.Limit {
			q.Status = QueryStatusFetched
		}

		q.Headers = data.Columns.Names()
		q.Rows = data.Rows
		g.Debug("Got %d rows", len(q.Rows))
	}

	q.Close(false)

	q.Duration = (float64(time.Now().UnixNano()/1000000) - float64(q.Time)) / 1000

	jBytes, err := json.Marshal(q)
	if err != nil {
		q.Rows = Rows{}
		err = g.Error(err, "could not marshall query")
		return g.ToMap(q), err
	}

	err = json.Unmarshal(jBytes, &result)
	if err != nil {
		q.Rows = Rows{}
		err = g.Error(err, "could not unmarshall query")
		return g.ToMap(q), err
	}

	Sync("queries", q)

	q.TrimRows(1) // only store 1 row in mem

	return
}

func (j *Job) MakeResult() (result map[string]interface{}) {
	task := j.Task
	return g.M(
		"id", j.Request["id"],
		"type", task.Type,
		"status", task.Status,
		"error", g.ErrMsg(task.Err),
		"rows", task.GetCount(),
		"rate", task.GetRate(10),
		"progress", task.Progress,
		"progress_hist", task.ProgressHist,
		"start_time", j.Time,
		"duration", (float64(time.Now().UnixNano()/1000000)-float64(j.Time))/1000,
		"bytes", task.Bytes,
		"config", g.M(
			"source", sling.Source{
				Conn:    task.Cfg.Source.Conn,
				Stream:  task.Cfg.Source.Stream,
				Limit:   task.Cfg.Source.Limit,
				Options: task.Cfg.Source.Options,
			},
			"target", sling.Target{
				Conn:       task.Cfg.Target.Conn,
				Object:     task.Cfg.Target.Object,
				Mode:       task.Cfg.Target.Mode,
				Options:    task.Cfg.Target.Options,
				PrimaryKey: task.Cfg.Target.PrimaryKey,
				UpdateKey:  task.Cfg.Target.UpdateKey,
			},
		),
	)
}
