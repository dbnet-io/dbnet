package server

import (
	"net/http"
	"sort"
	"time"

	"github.com/flarco/dbio/iop"
	"github.com/flarco/g"
	"github.com/flarco/scruto/store"
	"github.com/labstack/echo/v4"
	"github.com/spf13/cast"
)

func GetConnections(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get connection request")
	}

	conns := []string{}
	for k := range Connections {
		conns = append(conns, k)
	}
	sort.Strings(conns)

	return c.JSON(http.StatusOK, g.M("conns", conns))
}

func GetSchemata(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get schemata request")
	}

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

	data, err := ProcessRequest(req, rf)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not get schemas")
	}

	return c.JSON(http.StatusOK, data.ToJSONMap())
}

func GetSchemas(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get schemata request")
	}

	rf := func(c *Connection, req Request) (iop.Dataset, error) {
		return c.DbConn.GetSchemas()
	}

	data, err := ProcessRequest(req, rf)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not get schemas")
	}

	return c.JSON(http.StatusOK, data.ToJSONMap())
}

func GetTables(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get tables request")
	}

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

	data, err := ProcessRequest(req, rf)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not get schemas")
	}

	return c.JSON(http.StatusOK, data.ToJSONMap())
}

// GetColuumns returns a list of columns in a table for a connection
func GetColumns(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get tables request")
	}

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

	data, err := ProcessRequest(req, rf)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not get schemas")
	}

	return c.JSON(http.StatusOK, data.ToJSONMap())
}

// GetAnalysisSQL returns a sql text from an analysis template
func GetAnalysisSQL(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get analysis sql request")
	}
	return
}

// GetHistory returns a a list of queries from the history.
func GetHistory(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get history request")
	}
	return
}

func GetSQLRows(c echo.Context) (err error) {
	q := new(store.Query)
	if err = c.Bind(q); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get sql rows request")
	}

	// get connection
	conn, err := GetConn(q.Conn)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not get conn %s", q.Conn)
	}

	mux.Lock()
	query, ok := conn.Queries[q.ID]
	mux.Unlock()

	resubmit := func() error {
		result, err := doSubmitSQL(query)
		if err != nil {
			return g.ErrJSON(http.StatusInternalServerError, err, "could not query conn %s", query.Conn)
		}
		return c.JSON(200, result)
	}

	if !ok {
		query = q
		g.Debug("could not find query %s. Resubmitting...", query.ID)
		return resubmit()
	} else if !query.Pulled() {
		if query.Status == store.QueryStatusSubmitted {
			if q.Wait {
				for {
					if query.Status != store.QueryStatusSubmitted {
						break
					}
					time.Sleep(1 * time.Second)
				}
			} else {
				return c.JSON(200, g.ToMap(query))
			}
		}
		err = store.Db.Where(`rows is not null`).First(&query).Error
		if err != nil {
			g.Debug("could not pull rows for query %s. Resubmitting...", query.ID)
			return resubmit()
		}
	} else {
		data, err := FetchRows(query)
		if err != nil {
			return g.ErrJSON(http.StatusInternalServerError, err, "could not fecth rows")
		}
		query.Rows = data.Rows
	}

	data := g.ToMap(query)
	query.TrimRows(100) // only store 100 rows in sqlite
	Sync("queries", query, "status")

	return c.JSON(200, data)
}

func PostCancelQuery(c echo.Context) (err error) {
	query := new(store.Query)
	if err = c.Bind(query); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid cancel query request")
	}

	// get connection
	conn, err := GetConn(query.Conn)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not get conn %s", query.Conn)
	}

	mux.Lock()
	q, ok := conn.Queries[query.ID]
	mux.Unlock()
	if !ok {
		err = g.Error("could not find query %s", query.ID)
		return g.ErrJSON(http.StatusInternalServerError, err, "could not find query %s", query.ID)
	}

	q.Context.Cancel()
	if q.Result != nil {
		q.Result.Close()
	}

	query.Status = store.QueryStatusCancelled
	query.Rows = nil
	Sync("queries", query, "status")

	mux.Lock()
	delete(conn.Queries, query.ID)
	mux.Unlock()

	return c.JSON(http.StatusOK, g.ToMap(query))
}

func PostSubmitQuery(c echo.Context) (err error) {

	query := new(store.Query)
	if err = c.Bind(query); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get sql rows request")
	}

	if query.Limit == 0 {
		query.Limit = 100
	}

	result, err := doSubmitSQL(query)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not query conn %s", query.Conn)
	}
	return c.JSON(200, result)
}

// GetLoadSession loads session from store
func GetLoadSession(c echo.Context) (err error) {

	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "could not unmarshal request")
	}

	session := store.Session{Conn: req.Conn, Name: req.Name}
	err = store.Db.First(&session).Error
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not load session")
	}

	return c.JSON(200, session.Data)
}

// PostSaveSession saves a session to store
func PostSaveSession(c echo.Context) (err error) {

	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "could not unmarshal request")
	}

	data := g.M()
	err = g.Unmarshal(g.Marshal(req.Data), &data)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not unmarshal session data")
	}

	session := store.Session{
		Conn: req.Conn, Name: req.Name, Data: data,
	}
	err = Sync("sessions", &session)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not save session")
	}

	return c.JSON(200, g.M())
}