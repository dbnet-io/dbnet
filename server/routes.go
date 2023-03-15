package server

import (
	"net/http"
	"strings"

	"github.com/dbnet-io/dbnet/store"
	dbRestState "github.com/dbrest-io/dbrest/state"
	"github.com/flarco/g"
	"github.com/labstack/echo/v5"
)

var StandardRoutes = []echo.Route{
	{
		Name:        "Static",
		Method:      "GET",
		Path:        "/static/:folder/:name",
		Handler:     contentHandler,
		Middlewares: []echo.MiddlewareFunc{contentRewrite},
	},
	{
		Name:        "Assets Root",
		Method:      "GET",
		Path:        "/assets/:name",
		Handler:     contentHandler,
		Middlewares: []echo.MiddlewareFunc{contentRewrite},
	},
	{
		Name:        "Assets Connections",
		Method:      "GET",
		Path:        "/assets/:folder/:name",
		Handler:     contentHandler,
		Middlewares: []echo.MiddlewareFunc{contentRewrite},
	},
	{
		Name:    "getSettings",
		Method:  "GET",
		Path:    "/get-settings",
		Handler: GetSettings,
	},
	{
		Name:    "getHistory",
		Method:  "GET",
		Path:    "/get-history",
		Handler: GetHistory,
	},
	{
		Name:    "fileOperation",
		Method:  "POST",
		Path:    "/file-operation",
		Handler: PostFileOperation,
	},
	{
		Name:    "loadSession",
		Method:  "GET",
		Path:    "/load-session",
		Handler: GetLoadSession,
	},
	{
		Name:    "saveSession",
		Method:  "POST",
		Path:    "/save-session",
		Handler: PostSaveSession,
	},
}

// Request is the typical request struct
type Request struct {
	Name      string      `json:"name" query:"name"`
	Conn      string      `json:"conn" query:"conn"`
	Database  string      `json:"database" query:"database"`
	Schema    string      `json:"schema" query:"schema"`
	Table     string      `json:"table" query:"table"`
	Procedure string      `json:"procedure" query:"procedure"`
	Data      interface{} `json:"data" query:"data"`
}

func GetSettings(c echo.Context) (err error) {
	m := g.M(
		"homeDir", HomeDir,
	)

	return c.JSON(http.StatusOK, m)
}

// GetHistory returns a a list of queries from the history.
func GetHistory(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get history request")
	}

	entries := []dbRestState.Query{}
	conns := strings.Split(req.Conn, ",")
	switch req.Procedure {
	case "get_latest":
		err = store.Db.Order("start desc").Limit(100).
			Where("conn in (?)", conns).Find(&entries).Error

	case "search":
		whereValues := []interface{}{}
		orArr := []string{}
		for _, orStr := range strings.Split(req.Name, ",") {
			andWhere := []string{}
			for _, word := range strings.Split(orStr, " ") {
				andWhere = append(andWhere, g.F("(lower(conn || text || database) like ?)"))
				whereValues = append(whereValues, g.F("%%%s%%", strings.ToLower(strings.TrimSpace(word))))
			}
			orArr = append(orArr, "("+strings.Join(andWhere, " and ")+")")
		}
		whereStr := strings.Join(orArr, " or ")
		err = store.Db.Order("start desc").Limit(100).
			Where(whereStr, whereValues...).Find(&entries).Error
	}

	if err != nil {
		err = g.Error(err, "could not %s history", req.Procedure)
		return
	}

	return c.JSON(200, g.M("history", entries))
}

// GetLoadSession loads session from store
func GetLoadSession(c echo.Context) (err error) {

	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "could not unmarshal request")
	}

	session := store.Session{Name: req.Name}
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

	session := store.Session{Name: req.Name, Data: data}
	err = Sync("sessions", &session)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not save session")
	}

	return c.JSON(200, g.M())
}

// PostFileOperation operates with the file system
func PostFileOperation(c echo.Context) (err error) {
	req := FileRequest{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "could not unmarshal file request")
	}

	data := g.M()
	switch req.Operation {
	case OperationList:
		var items []FileItem
		items, err = req.List()
		data["items"] = items
	case OperationRead:
		var file FileItem
		file, err = req.Read()
		data["file"] = file
	case OperationWrite:
		err = req.Write()
	case OperationDelete:
		err = req.Delete()
	}
	if err != nil {
		err = g.Error(err, "error performing %s", req.Operation)
		return g.ErrJSON(http.StatusInternalServerError, err)
	}

	return c.JSON(200, data)
}
