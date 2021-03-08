package store

import (
	"time"

	"github.com/flarco/dbio/iop"
	"github.com/flarco/g"
	"github.com/jmoiron/sqlx"
)

// SchemaTable represent a schema table/view
type SchemaTable struct {
	Conn       string `gorm:"primaryKey"`
	SchemaName string `gorm:"primaryKey"`
	TableName  string `gorm:"primaryKey"`
	IsView     bool
	NumRows    int64
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
	UpdatedDt   time.Time `json:"updated_dt" gorm:"autoUpdateTime"`
}

// Query represents a query
type Query struct {
	ID        string          `json:"id" gorm:"primaryKey"`
	Conn      string          `json:"conn" gorm:"index"`
	Tab       string          `json:"tab"`
	Text      string          `json:"text"`
	Time      int64           `json:"time"`
	Duration  float64         `json:"duration"`
	Status    string          `json:"status"`
	Headers   []string        `json:"headers" gorm:"-"`
	Rows      [][]interface{} `json:"rows" gorm:"-"`
	Context   g.Context       `json:"-" gorm:"-"`
	Result    *sqlx.Rows      `json:"-" gorm:"-"`
	Columns   []iop.Column    `json:"-" gorm:"-"`
	UpdatedDt time.Time       `json:"-" gorm:"autoUpdateTime"`
}

// Session represents a connection session
type Session struct {
	Conn      string    `gorm:"primaryKey"`
	Name      string    `gorm:"primaryKey"`
	Data      g.Map     `json:"data" gorm:"type:json not null default '{}'"`
	CreatedDt time.Time `json:"created_dt" gorm:"autoCreateTime"`
	UpdatedDt time.Time `json:"updated_dt" gorm:"autoUpdateTime"`
}
