package server

import (
	"context"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/spf13/cast"

	"github.com/flarco/dbio/connection"
	"github.com/flarco/dbio/database"
	"github.com/flarco/dbio/iop"
	"github.com/flarco/g"
	"github.com/flarco/g/net"
	"github.com/flarco/scruto/store"
)

var (
	// Connections is all connections
	Connections  = map[string]*Connection{}
	mux          sync.Mutex
	defaultLimit = 100
	// Sync syncs to store
	Sync = store.Sync
)

// Connection is a connection
type Connection struct {
	Conn    *connection.Connection
	DbConn  database.Connection
	Queries map[string]*store.Query
}

// Request is the typical request struct
type Request struct {
	Name      string      `json:"name"`
	Conn      string      `json:"conn"`
	Schema    string      `json:"schema"`
	Table     string      `json:"table"`
	Procedure string      `json:"procedure"`
	Data      interface{} `json:"data"`
}

func init() {
	for key, val := range g.KVArrToMap(os.Environ()...) {
		if !strings.Contains(val, ":/") {
			continue
		}
		conn, err := connection.NewConnectionFromURL(key, val)
		if err != nil {
			continue
		}
		Connections[key] = &Connection{Conn: &conn, Queries: map[string]*store.Query{}}
	}
}

// NewQuery creates a Query object
func NewQuery(ctx context.Context, text string) *store.Query {
	return &store.Query{
		Text:    text,
		Context: g.NewContext(ctx),
	}
}

// FetchRows returns a dataset based on a number of rows
func FetchRows(q *store.Query, limit int) (data iop.Dataset, err error) {
	data = iop.NewDataset(q.Columns)

	nextFunc := func(it *iop.Iterator) bool {
		if limit > 0 && it.Counter >= cast.ToUint64(limit) {
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

	data, err = ds.Collect(limit)
	if err != nil {
		q.Context.Cancel()
		err = g.Error(err, "could not collect data")
		return
	}

	return
}

// ReqFunction is the request function type
type ReqFunction func(c *Connection, req Request) (iop.Dataset, error)

// ProcessRequest processes the request with the given function
func ProcessRequest(msg Message, reqFunc ReqFunction) (data iop.Dataset, err error) {
	req := Request{}
	err = g.Unmarshal(g.Marshal(msg.Data), &req)
	if err != nil {
		err = g.Error(err, "could not unmarshal request")
		return
	}

	c, err := GetConn(req.Conn)
	if err != nil {
		err = g.Error("could not get conn %s", req.Conn)
		return
	}

	return reqFunc(c, req)
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
	c.DbConn, err = database.NewConn(c.Conn.URL(), g.MapToKVArr(c.Conn.DataS())...)
	if err != nil {
		err = g.Error(err, "could not initialize database connection with provided credentials/url.")
		return
	}
	err = c.DbConn.Connect()
	if err != nil {
		err = g.Error(err, "could not connect with provided credentials/url")
		return
	}

	return
}

// LoadSchemata should:
// 1. load all schemas
// 2. load all objects in each schema
func LoadSchemata(connName string) (err error) {

	c, err := GetConn(connName)
	if err != nil {
		err = g.Error("could not get conn %s", connName)
		return
	}

	s, err := c.DbConn.GetSchemas()
	if err != nil {
		err = g.Error("could not get schemas for conn %s", connName)
		return
	}

	for _, r := range s.Rows {
		schemaName := cast.ToString(r[0])
		g.Info("loading schema " + schemaName)
		schema, err := c.DbConn.GetSchemaObjects(schemaName)
		if err != nil {
			err = g.Error("could not get schema %s", schemaName)
			break
		}

		// to store
		schemaTables := make([]store.SchemaTable, len(schema.Tables))
		totColumns := 0
		i := 0
		for _, table := range schema.Tables {
			totColumns = totColumns + len(table.Columns)
			schemaTables[i] = store.SchemaTable{
				Conn:       connName,
				SchemaName: schemaName,
				TableName:  table.Name,
				IsView:     table.IsView,
			}
			i++
		}

		if len(schemaTables) > 0 {
			Sync("schema_tables", &schemaTables, "conn", "schema_name", "table_name", "is_view")
		}

		tableColumns := make([]store.TableColumn, totColumns)
		i = 0
		for _, table := range schema.Tables {
			for _, col := range table.Columns {
				tableColumns[i] = store.TableColumn{
					Conn:       connName,
					SchemaName: schemaName,
					TableName:  table.Name,
					Name:       col.Name,
					ID:         col.Position,
					Type:       col.Type,
					Precision:  0,
					Scale:      0,
				}
				i++
			}
		}

		if len(tableColumns) > 0 {
			Sync(
				"table_columns", &tableColumns, "conn",
				"schema_name", "table_name",
				"name", "id", "type", "precision", "scale",
			)
		} else {
			err = g.Error("No columns found for conn %s", connName)
		}
	}
	return
}

// 1. open cursor and do not close result (to not pull all rows)
// 2. put DS in mem when client pulls more rows?
// 3. handle multiple statements ?
// 4. how to get addional rows?
func handleSubmitSQL(msg Message) (respMsg Message) {
	query := new(store.Query)
	err := g.Unmarshal(g.Marshal(msg.Data), query)
	if err != nil {
		err = g.Error(err, "could not unmarshal request")
		return net.NewMessageErr(err, msg.ReqID)
	}
	query.ID = msg.ReqID

	// get connection
	c, err := GetConn(query.Conn)
	if err != nil {
		err = g.Error(err, "could not get conn %s", query.Conn)
		return net.NewMessageErr(err, msg.ReqID)
	}

	query.Context = g.NewContext(c.DbConn.Context().Ctx)
	start := time.Now()
	Sync("queries", query)
	query.Result, err = c.DbConn.Db().QueryxContext(query.Context.Ctx, query.Text)
	if err != nil {
		query.Status = store.QueryStatusErrorred
		query.Err = g.ErrMsg(err)
		query.Duration = time.Since(start).Seconds()
		Sync("queries", query)
		respMsg = net.NewMessage(msg.Type, g.ToMap(query), msg.ReqID)
		err = g.Error(err, "could not execute query")
		return respMsg
	}

	colTypes, err := query.Result.ColumnTypes()
	if err != nil {
		err = g.Error(err, "result.ColumnTypes()")
		return net.NewMessageErr(err, msg.ReqID)
	}

	query.Columns = database.SQLColumns(colTypes, c.DbConn.Template().NativeTypeMap)

	mux.Lock()
	c.Queries[query.ID] = query
	mux.Unlock()

	// expire the query after 10 minutes
	timer := time.NewTimer(time.Duration(10*60) * time.Second)
	go func() {
		select {
		case <-timer.C:
			mux.Lock()
			delete(c.Queries, msg.ReqID)
			mux.Unlock()
		}
	}()

	// fetch rows
	limit := cast.ToInt(msg.Data["limit"])
	data, err := FetchRows(query, limit)
	if err != nil {
		err = g.Error(err, "could not fecth rows")
		return net.NewMessageErr(err, msg.ReqID)
	}

	query.Duration = time.Since(start).Seconds()
	query.Headers = data.Columns.Names()
	query.Rows = data.Rows

	respMsg = net.NewMessage(msg.Type, g.ToMap(query), msg.ReqID)

	Sync("queries", query)

	return
}

// handleGetSQLRows gets more rows from an existing query
func handleGetSQLRows(msg Message) (respMsg Message) {
	query := new(store.Query)
	err := g.Unmarshal(g.Marshal(msg.Data), query)
	if err != nil {
		err = g.Error(err, "could not unmarshal request")
		return net.NewMessageErr(err, msg.ReqID)
	}

	// get connection
	c, err := GetConn(query.Conn)
	if err != nil {
		err = g.Error("could not get conn %s", query.Conn)
		return net.NewMessageErr(err, msg.ReqID)
	}

	mux.Lock()
	q, ok := c.Queries[query.ID]
	mux.Unlock()
	if !ok {
		g.Debug("could not find query %s. Resubmitting...", query.ID)
		return handleSubmitSQL(msg)
	}

	limit := cast.ToInt(msg.Data["limit"])
	data, err := FetchRows(q, limit)
	if err != nil {
		err = g.Error(err, "could not fecth rows")
		return net.NewMessageErr(err, msg.ReqID)
	}
	query.Rows = data.Rows

	Sync("queries", query, "status")

	return net.NewMessage(msg.Type, g.ToMap(query), msg.ReqID)
}

// handleCancelSQL cancels an existing query
// if the query does not exist, then nothing is done
func handleCancelSQL(msg Message) (respMsg Message) {
	query := new(store.Query)
	err := g.Unmarshal(g.Marshal(msg.Data), query)
	if err != nil {
		err = g.Error(err, "could not unmarshal request")
		return net.NewMessageErr(err, msg.ReqID)
	}

	// get connection
	c, err := GetConn(query.Conn)
	if err != nil {
		err = g.Error("could not get conn %s", query.Conn)
		return net.NewMessageErr(err, msg.ReqID)
	}

	mux.Lock()
	q, ok := c.Queries[query.ID]
	mux.Unlock()
	if !ok {
		err = g.Error("could not find query %s", query.ID)
		return net.NewMessageErr(err, msg.ReqID)
	}

	q.Context.Cancel()
	q.Result.Close()

	query.Status = store.QueryStatusCancelled
	query.Rows = nil
	Sync("queries", query, "status")

	mux.Lock()
	delete(c.Queries, query.ID)
	mux.Unlock()

	return net.NewMessage(msg.Type, g.ToMap(query), msg.ReqID)
}

// handleGetConnections returns all existing connections
// in the local profile.
func handleGetConnections(msg Message) (respMsg Message) {

	conns := []string{}
	for k := range Connections {
		conns = append(conns, k)
	}
	sort.Strings(conns)

	return net.NewMessage(msg.Type, g.M("conns", conns), msg.ReqID)
}

// handleGetSchemas returns a list of schemas for a connection
func handleGetSchemas(msg Message) (respMsg Message) {

	rf := func(c *Connection, req Request) (iop.Dataset, error) {
		return c.DbConn.GetSchemas()
	}

	data, err := ProcessRequest(msg, rf)
	if err != nil {
		err = g.Error(err, "could not get schemas")
		return net.NewMessageErr(err, msg.ReqID)
	}

	return net.NewMessage(msg.Type, data.ToJSONMap(), msg.ReqID)
}

// handleGetAllSchemaTables returns a list of schemas, tables for a connection
func handleGetAllSchemaTables(msg Message) (respMsg Message) {

	rf := func(c *Connection, req Request) (iop.Dataset, error) {
		err := LoadSchemata(req.Conn)
		if err != nil {
			return iop.Dataset{}, g.Error(err, "could not get schemata")
		}

		schemaTables := []store.SchemaTable{}
		err = store.Db.Where("conn = ?", req.Conn).
			Order("schema_name, table_name").
			Find(&schemaTables).Error
		if err != nil {
			return iop.Dataset{}, g.Error(err, "could not query schemata")
		}

		columns := []string{"schema_name", "table_name", "is_view"}
		data := iop.NewDataset(iop.NewColumnsFromFields(columns...))

		for _, schemaTable := range schemaTables {
			row := []interface{}{schemaTable.SchemaName, schemaTable.TableName, schemaTable.IsView}
			data.Rows = append(data.Rows, row)
		}

		return data, nil
	}

	data, err := ProcessRequest(msg, rf)
	if err != nil {
		err = g.Error(err, "could not get schemas")
		return net.NewMessageErr(err, msg.ReqID)
	}

	return net.NewMessage(msg.Type, data.ToJSONMap(), msg.ReqID)
}

// handleGetTables returns a list of tables in a schema for a connection
func handleGetTables(msg Message) (respMsg Message) {

	rf := func(c *Connection, req Request) (data iop.Dataset, err error) {
		data = iop.NewDataset(iop.NewColumnsFromFields("name", "is_view"))
		tablesData, err := c.DbConn.GetTables(req.Schema)
		if err != nil {
			err = g.Error(err, "could not get tables")
			return
		}
		for _, r := range tablesData.Rows {
			data.Append(iop.Row(r[0], false))
		}

		viewsData, err := c.DbConn.GetViews(req.Schema)
		if err != nil {
			err = g.Error(err, "could not get views")
			return
		}
		for _, r := range viewsData.Rows {
			data.Append(iop.Row(r[0], true))
		}

		// to store
		schemaTables := make([]store.SchemaTable, len(data.Rows))
		for i, r := range data.Rows {
			schemaTables[i] = store.SchemaTable{
				Conn:       req.Conn,
				SchemaName: req.Schema,
				TableName:  cast.ToString(r[0]),
				IsView:     cast.ToBool(r[1]),
			}
		}

		if len(schemaTables) > 0 {
			Sync("schema_tables", &schemaTables, "conn", "schema_name", "table_name", "is_view")
		}

		return data, nil
	}

	data, err := ProcessRequest(msg, rf)
	if err != nil {
		return net.NewMessageErr(err, msg.ReqID)
	}

	return net.NewMessage(msg.Type, data.ToJSONMap(), msg.ReqID)
}

// handleGetColumns returns a list of columns in a table for a connection
func handleGetColumns(msg Message) (respMsg Message) {

	rf := func(c *Connection, req Request) (data iop.Dataset, err error) {
		table := g.F("%s.%s", req.Schema, req.Table)
		data, err = c.DbConn.GetColumnsFull(table)
		if err != nil {
			err = g.Error(err, "could not get columns")
			return
		}

		// to store
		tableColumns := make([]store.TableColumn, len(data.Rows))
		for i, r := range data.Rows {
			tableColumns[i] = store.TableColumn{
				Conn:       req.Conn,
				SchemaName: req.Schema,
				TableName:  req.Table,
				Name:       cast.ToString(r[2]),
				ID:         i + 1,
				Type:       cast.ToString(r[3]),
				Precision:  0,
				Scale:      0,
			}
		}

		if len(tableColumns) > 0 {
			Sync(
				"table_columns", &tableColumns, "conn",
				"schema_name", "table_name",
				"name", "id", "type", "precision", "scale",
			)
		} else {
			err = g.Error("No columns found for table %s", table)
		}

		return
	}

	data, err := ProcessRequest(msg, rf)
	if err != nil {
		err = g.Error(err, "could not get table columns")
		return net.NewMessageErr(err, msg.ReqID)
	}

	return net.NewMessage(msg.Type, data.ToJSONMap(), msg.ReqID)
}

// handleGetAnalysisSQL returns a sql text from an analysis template
func handleGetAnalysisSQL(msg Message) (respMsg Message) { return }

// handleGetHistory returns a a list of queries from the history.
func handleGetHistory(msg Message) (respMsg Message) { return }

// handleLoadSession loads session from store
func handleLoadSession(msg Message) (respMsg Message) {

	req := Request{}
	err := g.Unmarshal(g.Marshal(msg.Data), &req)
	if err != nil {
		err = g.Error(err, "could not unmarshal request")
		return net.NewMessageErr(err, msg.ReqID)
	}

	session := store.Session{Conn: req.Conn, Name: req.Name}
	err = store.Db.First(&session).Error
	if err != nil {
		err = g.Error(err, "could not load session")
		return net.NewMessageErr(err, msg.ReqID)
	}

	return net.NewMessage(msg.Type, session.Data, msg.ReqID)
}

// handleSaveSession saves a session to store
func handleSaveSession(msg Message) (respMsg Message) {

	req := Request{}
	err := g.Unmarshal(g.Marshal(msg.Data), &req)
	if err != nil {
		err = g.Error(err, "could not unmarshal request")
		return net.NewMessageErr(err, msg.ReqID)
	}

	data := g.M()
	err = g.Unmarshal(g.Marshal(req.Data), &data)
	if err != nil {
		err = g.Error(err, "could not unmarshal session data")
		return net.NewMessageErr(err, msg.ReqID)
	}

	session := store.Session{
		Conn: req.Conn, Name: req.Name, Data: data,
	}
	err = Sync("sessions", &session)
	if err != nil {
		err = g.Error(err, "could not save session")
		return net.NewMessageErr(err, msg.ReqID)
	}

	return net.NewMessage(msg.Type, g.M(), msg.ReqID)
}
