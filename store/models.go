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
	"github.com/slingdata-io/sling-cli/core/sling"
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
	UpdatedDt   time.Time `json:"updated_dt" gorm:"autoUpdateTime"`
}

// TableColumnStats is a table/view column statistics record
// is separate from TableColumn to keep analysis values
// when hard refreshing
type TableColumnStats struct {
	Conn         string    `json:"conn" gorm:"primaryKey"`
	Database     string    `json:"database"  gorm:"primaryKey"`
	SchemaName   string    `json:"schema_name" gorm:"primaryKey"`
	TableName    string    `json:"table_name" gorm:"primaryKey"`
	ColumnName   string    `json:"column_name" gorm:"primaryKey"`
	NumRows      int64     `json:"num_rows"`
	NumValues    int64     `json:"num_values"`
	NumDistinct  int64     `json:"num_distinct"`
	NumNulls     int64     `json:"num_nulls"`
	MinLen       int       `json:"min_len"`
	MaxLen       int       `json:"max_len"`
	LastAnalyzed time.Time `json:"last_analyzed"`
	UpdatedDt    time.Time `json:"updated_dt" gorm:"autoUpdateTime"`
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
	ID              string          `json:"id" query:"id" gorm:"primaryKey"`
	Conn            string          `json:"conn" query:"conn" gorm:"index"`
	Database        string          `json:"database" query:"database" gorm:"index"`
	Tab             string          `json:"tab" query:"tab"`
	Text            string          `json:"text" query:"text"`
	Time            int64           `json:"time" query:"time" gorm:"index:idx_query_time"`
	Duration        float64         `json:"duration" query:"duration"`
	Status          QueryStatus     `json:"status" query:"status"`
	Err             string          `json:"err" query:"err"`
	Headers         Headers         `json:"headers" query:"headers" gorm:"headers"`
	Rows            Rows            `json:"rows" query:"rows" gorm:"-"`
	Context         g.Context       `json:"-" gorm:"-"`
	Result          *sqlx.Rows      `json:"-" gorm:"-"`
	Columns         []iop.Column    `json:"-" gorm:"-"`
	Stream          *iop.Datastream `json:"-" gorm:"-"`
	Limit           int             `json:"limit" query:"limit" gorm:"-"` // -1 is unlimited
	Wait            bool            `json:"wait" query:"wait" gorm:"-"`
	UpdatedDt       time.Time       `json:"-" gorm:"autoUpdateTime"`
	Done            chan struct{}   `json:"-" gorm:"-"`
	Affected        int64           `json:"affected" gorm:"-"`
	ProjDir         string          `json:"proj_dir" gorm:"-"`
	Error           error           `json:"-" gorm:"-"`
	IsFieldAnalysis bool            `json:"-" gorm:"-"`
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

	Context g.Context            `json:"-" gorm:"-"`
	Task    *sling.TaskExecution `json:"-" gorm:"-"`
	Wait    bool                 `json:"wait" gorm:"-"`
	Done    chan struct{}        `json:"-" gorm:"-"`
}

// Session represents a connection session
type Session struct {
	Name      string    `json:"name" gorm:"primaryKey"`
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
		q.Error = err
		q.Err = g.ErrMsg(err)
		q.Duration = (float64(time.Now().UnixNano()/1000000) - float64(q.Time)) / 1000
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
		q.Stream, err = conn.StreamRowsContext(q.Context.Ctx, q.Text, g.M("limit", q.Limit))
		if err != nil {
			setError(err)
			err = g.Error(err, "could not execute query")
			return
		}

		q.Columns = q.Stream.Columns
		q.Status = QueryStatusCompleted
	} else {
		_, err = conn.NewTransaction(q.Context.Ctx)
		if err != nil {
			setError(err)
			err = g.Error(err, "could not start transaction")
			return err
		}

		defer conn.Rollback()
		res, err := conn.ExecMultiContext(q.Context.Ctx, q.Text)
		if err != nil {
			setError(err)
			err = g.Error(err, "could not execute queries")
			return err
		}
		err = conn.Commit()
		if err != nil {
			setError(err)
			err = g.Error(err, "could not commit")
			return err
		}

		q.Status = QueryStatusCompleted
		q.Affected, _ = res.RowsAffected()
	}

	return
}

// ProcessCustomReq looks at the text for yaml parsing
func (q *Query) ProcessCustomReq(conn database.Connection) (err error) {

	// see if analysis req
	if strings.HasPrefix(q.Text, "/*--") && strings.HasSuffix(q.Text, "--*/") {
		// is data request in yaml or json
		// /*--{"analysis":"field_count", "data": {...}} --*/
		// /*--{"metadata":"ddl_table", "data": {...}} --*/
		type analysisReq struct {
			Analysis string                 `json:"analysis" yaml:"analysis"`
			Metadata string                 `json:"metadata" yaml:"metadata"`
			Data     map[string]interface{} `json:"data" yaml:"data"`
		}

		req := analysisReq{}
		body := strings.TrimSuffix(strings.TrimPrefix(q.Text, "/*--"), "--*/")
		err = yaml.Unmarshal([]byte(body), &req)
		if err != nil {
			err = g.Error(err, "could not parse yaml/json request")
			return
		}

		sql := ""
		switch {
		case req.Analysis != "":
			sql, err = conn.GetAnalysis(req.Analysis, req.Data)
			q.IsFieldAnalysis = g.In(req.Analysis, "field_stat", "field_stat_deep")
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
	if q.Error != nil {
		err = q.Error
		return g.ToMap(q), err
	}

	if q.Affected == -1 && q.Stream != nil {

		// retrieve rows
		data, err := q.Stream.Collect(q.Limit)
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
	q.syncFieldAnalysisResult()

	q.TrimRows(1) // only store 1 row in mem

	return
}

func (q *Query) syncFieldAnalysisResult() {
	if !q.IsFieldAnalysis {
		return
	}

	tableColumnStats := make([]TableColumnStats, len(q.Rows))
	for i, row := range q.Rows {
		rec := map[string]interface{}{}
		for j, header := range q.Headers {
			rec[strings.ToLower(header)] = row[j]
		}

		tableColumnStats[i] = TableColumnStats{
			Conn:         strings.ToLower(q.Conn),
			Database:     strings.ToLower(q.Database),
			SchemaName:   strings.ToLower(cast.ToString(rec["schema_nm"])),
			TableName:    strings.ToLower(cast.ToString(rec["table_nm"])),
			ColumnName:   strings.ToLower(cast.ToString(rec["field"])),
			NumRows:      cast.ToInt64(rec["tot_cnt"]),
			NumValues:    cast.ToInt64(rec["f_cnt"]),
			NumDistinct:  cast.ToInt64(rec["f_dstct_cnt"]),
			NumNulls:     cast.ToInt64(rec["f_null_cnt"]),
			LastAnalyzed: time.Now(),
			MinLen:       cast.ToInt(rec["f_min_len"]),
			MaxLen:       cast.ToInt(rec["f_max_len"]),
		}
	}

	Sync(
		"table_column_stats", &tableColumnStats,
		"num_rows", "num_values", "num_distinct", "num_nulls",
		"min_len", "max_len", "last_analyzed",
	)
}

func (j *Job) MakeResult() (result map[string]interface{}) {
	task := j.Task
	rowRate, byteRate := task.GetRate(10)
	return g.M(
		"id", j.Request["id"],
		"type", task.Type,
		"status", task.Status,
		"error", g.ErrMsg(task.Err),
		"rows", task.GetCount(),
		"row_rate", rowRate,
		"byte_rate", byteRate,
		"progress", task.Progress,
		"progress_hist", task.ProgressHist,
		"start_time", j.Time,
		"duration", (float64(time.Now().UnixNano()/1000000)-float64(j.Time))/1000,
		"bytes", task.Bytes,
		"config", g.M(
			"source", sling.Source{
				Conn:       task.Config.Source.Conn,
				Stream:     task.Config.Source.Stream,
				Limit:      task.Config.Source.Limit,
				Options:    task.Config.Source.Options,
				PrimaryKey: task.Config.Source.PrimaryKey,
				UpdateKey:  task.Config.Source.UpdateKey,
			},
			"target", sling.Target{
				Conn:    task.Config.Target.Conn,
				Object:  task.Config.Target.Object,
				Options: task.Config.Target.Options,
			},
			"mode", task.Config.Mode,
		),
	)
}
