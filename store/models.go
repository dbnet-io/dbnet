package store

import (
	"time"

	"database/sql/driver"

	"github.com/flarco/g"
)

// SchemaTable represent a schema table/view
type SchemaTable struct {
	Connection string    `json:"connection" gorm:"primaryKey"`
	Database   string    `json:"database"  gorm:"primaryKey"`
	SchemaName string    `json:"schema_name" gorm:"primaryKey"`
	TableName  string    `json:"table_name" gorm:"primaryKey"`
	IsView     bool      `json:"is_view"`
	NumRows    int64     `json:"num_rows"`
	UpdatedDt  time.Time `json:"updated_dt" gorm:"autoUpdateTime"`
}

// TableColumn is a table/view column
type TableColumn struct {
	Connection  string    `json:"connection" gorm:"primaryKey"`
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
	Connection   string    `json:"connection" gorm:"primaryKey"`
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
const QueryStatusErrored QueryStatus = "errored"
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

// Job represents a job
type Job struct {
	ID       string  `json:"id" gorm:"primaryKey"`
	Type     string  `json:"type" gorm:"index:idx_job_type"`
	Request  g.Map   `json:"request" gorm:"type:json default '{}'"`
	Time     int64   `json:"time" gorm:"index:idx_job_time"`
	Duration float64 `json:"duration"`
	// Status    sling.ExecStatus `json:"status"`
	Err       string    `json:"err"`
	Result    g.Map     `json:"result" gorm:"type:json default '{}'"`
	UpdatedDt time.Time `json:"updated_dt" gorm:"autoUpdateTime"`

	Context g.Context `json:"-" gorm:"-"`
	// Task    *sling.TaskExecution `json:"-" gorm:"-"`
	Wait bool          `json:"wait" gorm:"-"`
	Done chan struct{} `json:"-" gorm:"-"`
}

// Session represents a connection session
type Session struct {
	Name      string    `json:"name" gorm:"primaryKey"`
	Data      g.Map     `json:"data" gorm:"type:json not null default '{}'"`
	CreatedDt time.Time `json:"created_dt" gorm:"autoCreateTime"`
	UpdatedDt time.Time `json:"updated_dt" gorm:"autoUpdateTime"`
}
