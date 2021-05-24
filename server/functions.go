package server

import (
	"context"
	"io/ioutil"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/spf13/cast"
	"gopkg.in/yaml.v3"

	"github.com/flarco/dbio/connection"
	"github.com/flarco/dbio/database"
	"github.com/flarco/dbio/iop"
	"github.com/flarco/g"
	"github.com/flarco/scruto/store"
)

var (
	// Connections is all connections
	Connections  = map[string]*Connection{}
	mux          sync.Mutex
	defaultLimit = 100
	// Sync syncs to store
	Sync    = store.Sync
	HomeDir = os.Getenv("DBNET_DIR")
)

// Connection is a connection
type Connection struct {
	Conn    *connection.Connection
	DbConn  database.Connection
	Queries map[string]*store.Query
	Props   map[string]string // to cache vars
}

// Request is the typical request struct
type Request struct {
	Name      string      `json:"name" query:"name"`
	Conn      string      `json:"conn" query:"conn"`
	Schema    string      `json:"schema" query:"schema"`
	Table     string      `json:"table" query:"table"`
	Procedure string      `json:"procedure" query:"procedure"`
	Data      interface{} `json:"data" query:"data"`
}

func init() {

	Connections, _ = LoadProfile(HomeDir + "/profile.yaml")

	// for key, val := range g.KVArrToMap(os.Environ()...) {
	// 	if !strings.Contains(val, ":/") {
	// 		continue
	// 	}
	// 	conn, err := connection.NewConnectionFromURL(key, val)
	// 	if err != nil {
	// 		continue
	// 	}
	// 	Connections[key] = &Connection{Conn: &conn, Queries: map[string]*store.Query{}, Props: map[string]string{}}
	// }
}

// LoadProfile loads the profile from the `profile.yaml` file in the home dir
func LoadProfile(path string) (conns map[string]*Connection, err error) {
	conns = map[string]*Connection{}
	profile := map[string]map[string]interface{}{}
	file, err := os.Open(path)
	if err != nil {
		err = g.Error(err, "error reading profile")
		return
	}

	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		err = g.Error(err, "error reading profile bytes")
		return
	}

	err = yaml.Unmarshal(bytes, profile)
	if err != nil {
		err = g.Error(err, "error parsing profile string")
		return
	}

	if dbs, ok := profile["databases"]; ok {
		for name, v := range dbs {
			switch v.(type) {
			case map[string]interface{}:
				data := v.(map[string]interface{})
				if n := cast.ToString(data["name"]); n != "" {
					data["name"] = name
				}

				conn, err := connection.NewConnectionFromMap(g.M("name", name, "data", data, "type", data["type"]))
				if err != nil {
					g.Warn("could not load connection %s", name)
					g.LogError(err)
					continue
				}

				conns[name] = &Connection{
					Conn:    &conn,
					Queries: map[string]*store.Query{},
					Props:   map[string]string{},
				}
				g.Trace("found in profile: " + name)
			default:
				g.Warn("did not handle %s", name)
			}
		}
	}
	return
}

// NewQuery creates a Query object
func NewQuery(ctx context.Context, text string) *store.Query {
	return &store.Query{
		Text:    text,
		Context: g.NewContext(ctx),
	}
}

// FetchRows returns a dataset based on a number of rows
func FetchRows(q *store.Query) (data iop.Dataset, err error) {
	data = iop.NewDataset(q.Columns)

	nextFunc := func(it *iop.Iterator) bool {
		if q.Limit > 0 && it.Counter >= cast.ToUint64(q.Limit) {
			q.Status = store.QueryStatusFetched
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

		q.Status = store.QueryStatusCompleted
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

// ReqFunction is the request function type
type ReqFunction func(c *Connection, req Request) (iop.Dataset, error)

// ProcessRequestFromMsg processes the request with the given function
func ProcessRequestFromMsg(msg Message, reqFunc ReqFunction) (data iop.Dataset, err error) {
	req := Request{}
	err = g.Unmarshal(g.Marshal(msg.Data), &req)
	if err != nil {
		err = g.Error(err, "could not unmarshal request")
		return
	}

	return ProcessRequest(req, reqFunc)
}

// ProcessRequest processes the request with the given function
func ProcessRequest(req Request, reqFunc ReqFunction) (data iop.Dataset, err error) {
	c, err := GetConn(req.Conn)
	if err != nil {
		err = g.Error(err, "could not get conn %s", req.Conn)
		return
	}

	return reqFunc(c, req)
}

// LoadSchemata should:
// 1. load all schemas
// 2. load all objects in each schema
func LoadSchemata(connName string) (err error) {

	c, err := GetConn(connName)
	if err != nil {
		err = g.Error(err, "could not get conn %s", connName)
		return
	}

	s, err := c.DbConn.GetSchemas()
	if err != nil {
		err = g.Error(err, "could not get schemas for conn %s", connName)
		return
	}

	for _, r := range s.Rows {
		schemaName := cast.ToString(r[0])
		g.Info("loading schema " + schemaName)
		schema, err := c.DbConn.GetSchemaObjects(schemaName)
		if err != nil {
			err = g.Error(err, "could not get schema %s", schemaName)
			break
		}

		// to store
		schemaTables := make([]store.SchemaTable, len(schema.Tables))
		totColumns := 0
		i := 0
		for _, table := range schema.Tables {
			totColumns = totColumns + len(table.Columns)
			schemaTables[i] = store.SchemaTable{
				Conn:       strings.ToLower(connName),
				SchemaName: strings.ToLower(schemaName),
				TableName:  strings.ToLower(table.Name),
				IsView:     table.IsView,
			}
			i++
		}

		if len(schemaTables) > 0 {
			Sync("schema_tables", &schemaTables, "conn", "schema_name", "table_name", "is_view")
		}

		for _, table := range schema.Tables {
			tableColumns := make([]store.TableColumn, len(table.Columns))
			for i, col := range table.Columns {
				tableColumns[i] = store.TableColumn{
					Conn:       strings.ToLower(connName),
					SchemaName: strings.ToLower(schemaName),
					TableName:  strings.ToLower(table.Name),
					Name:       strings.ToLower(col.Name),
					ID:         col.Position,
					Type:       strings.ToLower(col.Type),
					Precision:  0,
					Scale:      0,
				}
			}
			Sync(
				"table_columns", &tableColumns, "conn",
				"schema_name", "table_name",
				"name", "id", "type", "precision", "scale",
			)
		}

		if totColumns == 0 {
			err = g.Error("No columns found for conn %s", connName)
		}
	}
	return
}

// 1. open cursor and do not close result (to not pull all rows)
// 2. put DS in mem when client pulls more rows?
// 3. handle multiple statements ?
// 4. how to get addional rows?
func doSubmitSQL(query *store.Query) (result map[string]interface{}, err error) {

	if query.Limit == 0 {
		query.Limit = 100
	}

	// get connection
	c, err := GetConn(query.Conn)
	if err != nil {
		err = g.Error(err, "could not get conn %s", query.Conn)
		return
	}

	// see if analysis req
	query.Text = strings.TrimSuffix(query.Text, ";")
	if strings.HasPrefix(query.Text, "/*@") && strings.HasSuffix(query.Text, "@*/") {
		// is data request in yaml or json
		// /*@{"analysis":"field_count", "data": {...}} @*/
		// /*@{"metadata":"ddl_table", "data": {...}} @*/
		type analysisReq struct {
			Analysis string                 `json:"analysis" yaml:"analysis"`
			Metadata string                 `json:"metadata" yaml:"metadata"`
			Data     map[string]interface{} `json:"data" yaml:"data"`
		}

		req := analysisReq{}
		body := strings.TrimSuffix(strings.TrimPrefix(query.Text, "/*@"), "@*/")
		err = yaml.Unmarshal([]byte(body), &req)
		if err != nil {
			query.Status = store.QueryStatusErrorred
			query.Err = g.ErrMsg(err)
			Sync("queries", query)
			err = g.Error(err, "could not parse yaml/json request")
			return
		}

		sql := ""
		switch {
		case req.Analysis != "":
			sql, err = c.DbConn.GetAnalysis(req.Analysis, req.Data)
		case req.Metadata != "":
			template, ok := c.DbConn.Template().Metadata[req.Metadata]
			if !ok {
				err = g.Error("metadata key '%s' not found", req.Metadata)
			}
			sql = g.Rm(template, req.Data)
		}

		if err != nil {
			query.Status = store.QueryStatusErrorred
			query.Err = g.ErrMsg(err)
			Sync("queries", query)
			err = g.Error(err, "could not execute query")
			return
		}

		query.Text = query.Text + "\n\n" + sql
	}

	query.Status = store.QueryStatusSubmitted
	query.Context = g.NewContext(c.DbConn.Context().Ctx)
	result = map[string]interface{}{}

	mux.Lock()
	c.Queries[query.ID] = query
	mux.Unlock()

	Sync("queries", query)

	doSubmit := func() {
		start := time.Now()
		query.Result, err = c.DbConn.Db().QueryxContext(query.Context.Ctx, query.Text)
		if err != nil {
			query.Status = store.QueryStatusErrorred
			query.Err = g.ErrMsg(err)
			query.Duration = time.Since(start).Seconds()
			Sync("queries", query)
			err = g.Error(err, "could not execute query")
			return
		}

		colTypes, err := query.Result.ColumnTypes()
		if err != nil {
			err = g.Error(err, "result.ColumnTypes()")
			return
		}

		query.Columns = database.SQLColumns(colTypes, c.DbConn.Template().NativeTypeMap)

		// expire the query after 10 minutes
		timer := time.NewTimer(time.Duration(10*60) * time.Second)
		go func() {
			select {
			case <-timer.C:
				mux.Lock()
				delete(c.Queries, query.ID)
				mux.Unlock()
			}
		}()

		// fetch rows
		data, err := FetchRows(query)
		if err != nil {
			err = g.Error(err, "could not fecth rows")
			return
		}

		query.Duration = time.Since(start).Seconds()
		query.Headers = data.Columns.Names()
		query.Rows = data.Rows

		result = g.ToMap(query)

		query.TrimRows(100) // only store 100 rows in sqlite
		Sync("queries", query)

		query.TrimRows(1) // only store 1 row in mem
	}

	if query.Wait {
		doSubmit()
	} else {
		result = g.ToMap(query)
		go doSubmit()
	}

	return
}

// GetConn gets the connection
func GetConn(name string) (c *Connection, err error) {
	mux.Lock()
	c, ok := Connections[name]
	mux.Unlock()
	if !ok {
		err = g.Error("could not find conn %s", name)
		return
	}

	// connect or use pool
	os.Setenv("DBIO_USE_POOL", "TRUE")
	props := append(g.MapToKVArr(c.Props), g.MapToKVArr(c.Conn.DataS())...)
	c.DbConn, err = database.NewConn(c.Conn.URL(), props...)
	if err != nil {
		err = g.Error(err, "could not initialize database connection '%s' with provided credentials/url.", name)
		return
	}
	err = c.DbConn.Connect()
	if err != nil {
		err = g.Error(err, "could not connect with provided credentials/url")
		return
	}
	c.Props = c.DbConn.Props()

	return
}
