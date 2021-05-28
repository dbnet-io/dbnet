package server

import (
	"context"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/flarco/dbio/database"
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

	loadConnections()

	conns := []string{}
	for k := range Connections {
		conns = append(conns, k)
	}
	sort.Strings(conns)

	return c.JSON(http.StatusOK, g.M("conns", conns))
}

func GetDatabases(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get databases request")
	}

	rf := func(c database.Connection, req Request) (data iop.Dataset, err error) {
		sql, ok := c.Template().Metadata["databases"]
		if !ok {
			err = g.Error("no template found for getting databases for %s", c.GetType())
			return
		}
		data, err = c.Query(sql)
		if err != nil {
			err = g.Error(err, "could not query databases")
			return
		}
		return
	}

	data, err := ProcessRequest(req, rf)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not get databases")
	}

	return c.JSON(http.StatusOK, data.ToJSONMap())
}

func GetSchemata(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get schemata request")
	}

	rf := func(c database.Connection, req Request) (iop.Dataset, error) {
		schemaTables := []store.SchemaTable{}
		load := func() error {
			err := store.Db.Where("conn = ? and database =?", strings.ToLower(req.Conn), strings.ToLower(req.Database)).
				Order("schema_name, table_name").
				Find(&schemaTables).Error
			if err != nil {
				return g.Error(err, "could not query schemata")
			}
			return nil
		}

		err := load()
		if len(schemaTables) == 0 || req.Procedure == "refresh" {
			err = LoadSchemata(req.Conn, req.Database)
			if err != nil {
				return iop.Dataset{}, g.Error(err, "could not get schemata")
			}

			err = load()
			if err != nil {
				return iop.Dataset{}, g.Error(err, "could not query schemata")
			}
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

	rf := func(c database.Connection, req Request) (iop.Dataset, error) {
		return c.GetSchemas()
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

	rf := func(c database.Connection, req Request) (data iop.Dataset, err error) {
		data = iop.NewDataset(iop.NewColumnsFromFields("name", "is_view"))
		tablesData, err := c.GetTables(req.Schema)
		if err != nil {
			err = g.Error(err, "could not get tables")
			return
		}
		for _, r := range tablesData.Rows {
			data.Append(iop.Row(r[0], false))
		}

		viewsData, err := c.GetViews(req.Schema)
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
				Conn:       strings.ToLower(req.Conn),
				Database:   strings.ToLower(req.Database),
				SchemaName: strings.ToLower(req.Schema),
				TableName:  strings.ToLower(cast.ToString(r[0])),
				IsView:     cast.ToBool(r[1]),
			}
		}

		if len(schemaTables) > 0 {
			Sync("schema_tables", &schemaTables, "conn", "database", "schema_name", "table_name", "is_view")
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

	rf := func(c database.Connection, req Request) (data iop.Dataset, err error) {
		tableColumns := []store.TableColumn{}
		store.Db.
			Where(`conn = ? and database = ? and schema_name = ? 
			and table_name = ?`, strings.ToLower(req.Conn), strings.ToLower(req.Database),
				strings.ToLower(req.Schema), strings.ToLower(req.Table)).
			Order("id").Find(&tableColumns)

		if len(tableColumns) == 0 || req.Procedure == "refresh" {
			table := g.F("%s.%s", req.Schema, req.Table)
			data, err = c.GetColumnsFull(table)
			if err != nil {
				err = g.Error(err, "could not get columns")
				return
			}

			// to store
			tableColumns = make([]store.TableColumn, len(data.Rows))
			for i, r := range data.Rows {
				tableColumns[i] = store.TableColumn{
					Conn:       strings.ToLower(req.Conn),
					Database:   strings.ToLower(req.Database),
					SchemaName: strings.ToLower(req.Schema),
					TableName:  strings.ToLower(req.Table),
					Name:       strings.ToLower(cast.ToString(r[2])),
					ID:         i + 1,
					Type:       strings.ToLower(cast.ToString(r[3])),
					Precision:  0,
					Scale:      0,
				}
			}

			if len(tableColumns) > 0 {
				Sync(
					"table_columns", &tableColumns, "conn",
					"database", "schema_name", "table_name",
					"name", "id", "type", "precision", "scale",
				)
			} else {
				err = g.Error("No columns found for table %s", table)
			}
		} else {
			data.Columns = iop.NewColumnsFromFields("schema_name", "table_name", "column_name", "data_type", "position")
			for _, col := range tableColumns {
				row := []interface{}{col.SchemaName, col.TableName, col.Name, col.Type, col.ID}
				data.Rows = append(data.Rows, row)
			}
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

	// get connection
	conn, err := GetConn(req.Conn, req.Database)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not get conn %s", req.Conn)
	}

	template, ok := conn.Template().Analysis[req.Procedure]
	if !ok {
		err = g.Error("did not find Analysis: " + req.Procedure)
		return g.ErrJSON(http.StatusNotFound, err)
	}

	data := g.M()
	err = g.Unmarshal(g.Marshal(req.Data), &data)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not unmarshal")
	}

	sql := g.Rm(template, data)
	return c.JSON(http.StatusOK, g.M("sql", sql))
}

// GetHistory returns a a list of queries from the history.
func GetHistory(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get history request")
	}

	entries := []store.Query{}
	switch req.Procedure {
	case "get_latest":
		err = store.Db.Order("time desc").Limit(100).
			Where("conn = ?", req.Conn).Find(&entries).Error

	case "search":
		filter := g.F("%%%s%%", strings.ToLower(req.Name))
		err = store.Db.Order("time desc").Limit(100).
			Where("conn = ? and lower(text) like ?", req.Conn, filter).Find(&entries).Error
	}

	if err != nil {
		err = g.Error(err, "could not %s history", req.Procedure)
		return
	}

	return c.JSON(200, g.M("history", entries))
}

func GetCachedResult(c echo.Context) (err error) {
	q := NewQuery(context.Background())
	if err = c.Bind(q); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get result request")
	}
	query := &store.Query{ID: q.ID}
	err = store.Db.First(query).Error
	if err != nil {
		return g.ErrJSON(http.StatusNotFound, err, "could not find query %s", q.ID)
	}

	return c.JSON(200, g.ToMap(query))
}

func GetSQLRows(c echo.Context) (err error) {
	q := NewQuery(context.Background())
	if err = c.Bind(q); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get sql rows request")
	}

	mux.Lock()
	query, ok := Queries[q.ID]
	mux.Unlock()

	if !ok {
		query = q
		g.Debug("could not find query %s. Resubmitting...", query.ID)
		return PostSubmitQuery(c)
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
			return PostSubmitQuery(c)
		}
	} else {
		data, err := query.FetchRows()
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
	query := NewQuery(context.Background())
	if err = c.Bind(query); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid cancel query request")
	}

	mux.Lock()
	q, ok := Queries[query.ID]
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
	delete(Queries, query.ID)
	mux.Unlock()

	return c.JSON(http.StatusOK, g.ToMap(query))
}

func PostSubmitQuery(c echo.Context) (err error) {

	query := NewQuery(context.Background())
	if err = c.Bind(query); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get sql rows request")
	}

	if query.Limit == 0 {
		query.Limit = 100
	}

	if c.Request().Header.Get("DbNet-Continue") != "" {
		// pick up where left off

		mux.Lock()
		var ok bool
		qId := query.ID
		query, ok = Queries[query.ID]
		mux.Unlock()
		if !ok {
			return g.ErrJSON(http.StatusInternalServerError, g.Error("could not find query %s to continue", qId))
		}
	} else {
		// submit
		err = doSubmitSQL(query)
		if err != nil {
			return g.ErrJSON(http.StatusInternalServerError, err, "could not query conn %s", query.Conn)
		}
	}

	ticker := time.NewTicker(90 * time.Second)
	defer ticker.Stop()

	result := g.ToMap(query)
	status := 200
	if query.Wait {
		select {
		case <-query.Done:
			result, err = query.ProcessResult()
			if err != nil {
				return g.ErrJSON(http.StatusInternalServerError, err, "could not process query")
			}
		case <-ticker.C:
			status = 202 // when status is 202, follow request with header "DbNet-Continue"
		}
	}

	return c.JSON(status, result)
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
		if !strings.Contains(err.Error(), "record not found") {
			return g.ErrJSON(http.StatusInternalServerError, err, "could not load session")
		}
		err = nil // create new session
		session.Data = g.M("connection", g.M("name", req.Conn))
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
