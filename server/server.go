package server

import (
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

	e.GET(RouteGetConnections.String(), func(c echo.Context) (err error) { return })
	e.GET(RouteGetSchemata.String(), func(c echo.Context) (err error) { return })
	e.GET(RouteGetSchemas.String(), func(c echo.Context) (err error) { return })
	e.GET(RouteGetTables.String(), func(c echo.Context) (err error) { return })
	e.GET(RouteGetColumns.String(), func(c echo.Context) (err error) { return })
	e.GET(RouteGetAnalysisSQL.String(), func(c echo.Context) (err error) { return })
	e.GET(RouteGetHistory.String(), func(c echo.Context) (err error) { return })
	e.GET(RouteGetSQLRows.String(), func(c echo.Context) (err error) { return })

	e.POST(RouteSubmitSQL.String(), func(c echo.Context) (err error) { return })
	e.POST(RouteCancelSQL.String(), func(c echo.Context) (err error) { return })
	e.POST(RouteLoadSession.String(), func(c echo.Context) (err error) { return })
	e.POST(RouteSaveSession.String(), func(c echo.Context) (err error) { return })

	return &Server{
		Port:       "5987",
		EchoServer: e,
		WsServer:   wsServer,
		StartTime:  time.Now(),
	}
}
