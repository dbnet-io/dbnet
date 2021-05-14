package server

import (
	"os"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/spf13/cast"
)

// Server is the main server
type Server struct {
	Port       string
	EchoServer *echo.Echo
	WsServer   *WsServer
	StartTime  time.Time
}

// RouteName is the name of a route
type RouteName string

const (
	// RouteWs is the websocket route
	RouteWs             RouteName = "/ws"
	RouteSubmitSQL      RouteName = "/submit-sql"
	RouteCancelSQL      RouteName = "/cancel-sql"
	RouteGetConnections RouteName = "/get-connections"
	RouteGetSchemata    RouteName = "/get-schemata"
	RouteGetSchemas     RouteName = "/get-schemas"
	RouteGetTables      RouteName = "/get-tables"
	RouteGetColumns     RouteName = "/get-columns"
	RouteGetAnalysisSQL RouteName = "/get-analysis-sql"
	RouteGetHistory     RouteName = "/get-history"
	RouteGetSQLRows     RouteName = "/get-sql-rows"
	RouteLoadSession    RouteName = "/load-session"
	RouteSaveSession    RouteName = "/save-session"
)

func (r RouteName) String() string {
	return string(r)
}

// NewServer creates a new server
func NewServer() *Server {
	e := echo.New()
	e.HideBanner = true
	e.Use(middleware.Logger())
	e.Use(Recover())
	e.Use(middleware.RequestIDWithConfig(middleware.RequestIDConfig{
		Generator: func() string {
			return cast.ToString(time.Now().UnixNano())
		},
	}))

	// websocket server
	wsServer := NewWsServer()

	e.GET(RouteWs.String(), wsServer.NewClient)

	e.GET(RouteGetConnections.String(), GetConnections)
	e.GET(RouteGetSchemata.String(), GetSchemata)
	e.GET(RouteGetSchemas.String(), GetSchemas)
	e.GET(RouteGetTables.String(), GetTables)
	e.GET(RouteGetColumns.String(), GetColumns)
	e.GET(RouteGetAnalysisSQL.String(), GetAnalysisSQL)
	e.GET(RouteGetHistory.String(), GetHistory)
	e.GET(RouteGetSQLRows.String(), GetSQLRows)
	e.GET(RouteLoadSession.String(), GetLoadSession)

	e.POST(RouteSubmitSQL.String(), PostSubmitQuery)
	e.POST(RouteCancelSQL.String(), PostCancelQuery)
	e.POST(RouteSaveSession.String(), PostSaveSession)

	port := os.Getenv("DBNET_PORT")
	if port == "" {
		port = "5987"
	}

	return &Server{
		Port:       port,
		EchoServer: e,
		WsServer:   wsServer,
		StartTime:  time.Now(),
	}
}
