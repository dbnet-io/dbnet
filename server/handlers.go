package server

import (
	"context"
	"os"
	"sort"
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
	db           = store.Db
)

// Connection is a connection
type Connection struct {
	Conn    connection.Connection
	DbConn  database.Connection
	Queries map[string]*Query
}

// Query is a query
type Query store.Query

// Request is the typical request struct
type Request struct {
	Conn   string `json:"conn"`
	Schema string `json:"schema"`
	Table  string `json:"table"`
}

// NewQuery creates a Query object
func NewQuery(ctx context.Context, text string) *Query {
	return &Query{
		Text:    text,
		Context: g.NewContext(ctx),
	}
}

// FetchRows returns a dataset based on a number of rows
func (q *Query) FetchRows(limit int) (data iop.Dataset, err error) {
	data = iop.NewDataset(q.Columns)

	nextFunc := func(it *iop.Iterator) bool {
		if limit > 0 && it.Counter >= cast.ToUint64(limit) {
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

// 1. open cursor and do not close result (to not pull all rows)
// 2. put DS in mem when client pulls more rows?
// 3. handle multiple statements ?
// 4. how to get addional rows?
func handleSubmitSQL(msg Message) (respMsg Message) {
	query := new(Query)
	err := g.Unmarshal(g.Marshal(msg.Data), query)
	if err != nil {
		err = g.Error(err, "could not unmarshal request")
		return net.NewMessageErr(err, msg.ReqID)
	}
	query.ID = msg.ReqID

	// get connection
	c, err := GetConn(query.Conn)
	if err != nil {
		err = g.Error("could not get conn %s", query.Conn)
		return net.NewMessageErr(err, msg.ReqID)
	}

	query.Context = g.NewContext(c.DbConn.Context().Ctx)
	start := time.Now()
	query.Result, err = c.DbConn.Db().QueryxContext(query.Context.Ctx, query.Text)
	if err != nil {
		err = g.Error(err, "could not execute query")
		return net.NewMessageErr(err, msg.ReqID)
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
	data, err := query.FetchRows(defaultLimit)
	if err != nil {
		err = g.Error(err, "could not fecth rows")
		return net.NewMessageErr(err, msg.ReqID)
	}

	query.Duration = time.Since(start).Seconds()
	query.Headers = iop.Columns(data.Columns).Fields()
	query.Rows = data.Rows

	respMsg = net.NewMessage(net.AckMsgType, g.ToMap(query), msg.ReqID)

	return
}

// handleGetSQLRows gets more rows from an existing query
// if the query is not found, then handleSubmitSQL should
// be used to resubmit the query
func handleGetSQLRows(msg Message) (respMsg Message) {
	query := new(Query)
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

	data, err := q.FetchRows(defaultLimit)
	if err != nil {
		err = g.Error(err, "could not fecth rows")
		return net.NewMessageErr(err, msg.ReqID)
	}

	return net.NewMessage(net.AckMsgType, data.ToJSONMap(), msg.ReqID)
}

// handleCancelSQL cancels an existing query
// if the query does not exist, then nothing is done
func handleCancelSQL(msg Message) (respMsg Message) {
	query := new(Query)
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

	return
}

// handleGetConnections returns all existing connections
// in the local profile.
func handleGetConnections(msg Message) (respMsg Message) {

	conns := []string{}
	for k := range Connections {
		conns = append(conns, k)
	}
	sort.Strings(conns)

	return net.NewMessage(net.AckMsgType, g.M("conns", conns), msg.ReqID)
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

	return net.NewMessage(net.AckMsgType, data.ToJSONMap(), msg.ReqID)
}

// handleGetTables returns a list of tables in a schema for a connection
func handleGetTables(msg Message) (respMsg Message) {

	rf := func(c *Connection, req Request) (data iop.Dataset, err error) {

		tablesData, err := c.DbConn.GetTables(req.Schema)
		if err != nil {
			err = g.Error(err, "could not get tables")
			return
		}

		viewsData, err := c.DbConn.GetViews(req.Schema)
		if err != nil {
			err = g.Error(err, "could not get views")
			return
		}

		tablesData.Rows = append(tablesData.Rows, viewsData.Rows...)
		return tablesData, nil
	}

	data, err := ProcessRequest(msg, rf)
	if err != nil {
		return net.NewMessageErr(err, msg.ReqID)
	}

	return net.NewMessage(net.AckMsgType, data.ToJSONMap(), msg.ReqID)
}

// handleGetColumns returns a list of columns in a table for a connection
func handleGetColumns(msg Message) (respMsg Message) {

	rf := func(c *Connection, req Request) (data iop.Dataset, err error) {
		return c.DbConn.GetColumnsFull(req.Table)
	}

	data, err := ProcessRequest(msg, rf)
	if err != nil {
		err = g.Error(err, "could not get table columns")
		return net.NewMessageErr(err, msg.ReqID)
	}

	return net.NewMessage(net.AckMsgType, data.ToJSONMap(), msg.ReqID)
}

// handleGetAnalysisSQL returns a sql text from an analysis template
func handleGetAnalysisSQL(msg Message) (respMsg Message) { return }

// handleGetHistory returns a a list of queries from the history.
func handleGetHistory(msg Message) (respMsg Message) { return }
