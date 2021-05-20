package store

import (
	"time"

	"database/sql/driver"

	"github.com/flarco/dbio/iop"
	"github.com/flarco/g"
	"github.com/jmoiron/sqlx"
)

// SchemaTable represent a schema table/view
type SchemaTable struct {
	Conn       string    `json:"conn" gorm:"primaryKey"`
	SchemaName string    `json:"schema_name" gorm:"primaryKey"`
	TableName  string    `json:"table_name" gorm:"primaryKey"`
	IsView     bool      `json:"is_view"`
	NumRows    int64     `json:"num_rows"`
	UpdatedDt  time.Time `json:"updated_dt" gorm:"autoUpdateTime"`
}

// TableColumn is a table/view column
type TableColumn struct {
	Conn        string    `json:"conn" gorm:"primaryKey"`
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
	ID        string       `json:"id" query:"id" gorm:"primaryKey"`
	Conn      string       `json:"conn" query:"conn" gorm:"index"`
	Tab       string       `json:"tab" query:"tab"`
	Text      string       `json:"text" query:"text"`
	Time      int64        `json:"time" query:"time" gorm:"index:idx_query_time"`
	Duration  float64      `json:"duration" query:"duration"`
	Status    QueryStatus  `json:"status" query:"status"`
	Err       string       `json:"err" query:"err"`
	Headers   Headers      `json:"headers" query:"headers" gorm:"headers"`
	Rows      Rows         `json:"rows" query:"rows" gorm:"rows"`
	Context   g.Context    `json:"-" gorm:"-"`
	Result    *sqlx.Rows   `json:"-" gorm:"-"`
	Columns   []iop.Column `json:"-" gorm:"-"`
	Limit     int          `json:"-" gorm:"-"`
	Wait      bool         `json:"wait" query:"wait" gorm:"-"`
	UpdatedDt time.Time    `json:"-" gorm:"autoUpdateTime"`
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
