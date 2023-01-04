package server

import (
	"embed"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/dbrest-io/dbrest/server"
	"github.com/flarco/g"
	"github.com/flarco/g/process"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/spf13/cast"
)

// Server is the main server
type Server struct {
	Port       string
	EchoServer *echo.Echo
	StartTime  time.Time
	DbtServer  *process.Proc
}

//go:embed app
var appFiles embed.FS

// RouteName is the name of a route
type RouteName string

const (
	// RouteWs is the websocket route
	RouteIndex          RouteName = "/"
	RouteWs             RouteName = "/ws"
	RouteSubmitSQL      RouteName = "/submit-sql"
	RouteSubmitDbt      RouteName = "/submit-dbt"
	RouteCancelSQL      RouteName = "/cancel-sql"
	RouteExtractLoad    RouteName = "/extract-load"
	RouteGetSettings    RouteName = "/get-settings"
	RouteGetConnections RouteName = "/get-connections"
	RouteGetDatabases   RouteName = "/get-databases"
	RouteGetSchemata    RouteName = "/get-schemata"
	RouteGetSchemas     RouteName = "/get-schemas"
	RouteGetTables      RouteName = "/get-tables"
	RouteGetColumns     RouteName = "/get-columns"
	RouteGetAnalysisSQL RouteName = "/get-analysis-sql"
	RouteGetHistory     RouteName = "/get-history"
	RouteLoadSession    RouteName = "/load-session"
	RouteSaveSession    RouteName = "/save-session"
	RouteFileOperation  RouteName = "/file-operation"
)

func (r RouteName) String() string {
	return string(r)
}

// NewServer creates a new server
func NewServer() *Server {
	e := echo.New()
	// e.Use(sentry.SentryEcho())
	e.Use(middleware.RequestIDWithConfig(middleware.RequestIDConfig{
		Generator: func() string {
			return cast.ToString(time.Now().UnixNano())
		},
	}))

	// CORS
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:5987", "http://localhost:3000", "http://localhost:3001", "tauri://localhost", "https://custom-protocol-taurilocalhost"},
		// AllowCredentials: true,
		// AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.He`aderAccept},
		// AllowOriginFunc: func(origin string) (bool, error) {
		// 	println(origin)
		// 	return false, nil
		// },
	}))

	// embedded files
	contentHandler := echo.WrapHandler(http.FileServer(http.FS(appFiles)))
	contentRewrite := middleware.Rewrite(map[string]string{"/*": "/app/$1"})

	// add routes
	for _, route := range server.StandardRoutes {
		route.Middlewares = append(route.Middlewares, middleware.Logger())
		route.Middlewares = append(route.Middlewares, middleware.Recover())
		e.AddRoute(route)
	}

	e.GET(RouteIndex.String()+"*", contentHandler, contentRewrite)
	e.GET(RouteGetSettings.String(), GetSettings)
	e.GET(RouteGetConnections.String(), GetConnections)
	e.GET(RouteGetDatabases.String(), GetDatabases)
	e.GET(RouteGetSchemata.String(), GetSchemata)
	e.GET(RouteGetSchemas.String(), GetSchemas)
	e.GET(RouteGetTables.String(), GetTables)
	e.GET(RouteGetColumns.String(), GetColumns)
	e.GET(RouteGetAnalysisSQL.String(), GetAnalysisSQL)
	e.GET(RouteGetHistory.String(), GetHistory)
	e.GET(RouteLoadSession.String(), GetLoadSession)

	e.POST(RouteSubmitSQL.String(), PostSubmitQuery)
	e.POST(RouteExtractLoad.String(), PostSubmitExtractLoadJob)
	e.POST(RouteCancelSQL.String(), PostCancelQuery)
	e.POST(RouteSaveSession.String(), PostSaveSession)
	e.POST(RouteFileOperation.String(), PostFileOperation)

	port := os.Getenv("DBNET_PORT")
	if port == "" {
		port = "5987"
	}

	return &Server{
		Port:       port,
		EchoServer: e,
		StartTime:  time.Now(),
	}
}

// Start starts the server
func (srv *Server) Start() {
	defer srv.Cleanup()
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigs
		srv.Cleanup()
		os.Exit(1)
	}()

	if err := srv.EchoServer.Start(":" + srv.Port); err != http.ErrServerClosed {
		g.LogFatal(g.Error(err, "could not start server"))
	}
}

// Cleanup cleans up
func (srv *Server) Cleanup() {
	// clean up
	mux.Lock()
	defer mux.Unlock()
}

// Loop cycles tasks
func (srv *Server) Loop() {
	ticker6Hours := time.NewTicker(6 * time.Hour)
	defer ticker6Hours.Stop()
	<-ticker6Hours.C
}
