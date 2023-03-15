package server

import (
	"embed"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	dbRestServer "github.com/dbrest-io/dbrest/server"
	"github.com/dbrest-io/dbrest/state"
	"github.com/flarco/g"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/spf13/cast"
)

// Server is the main server
type Server struct {
	Port       string
	EchoServer *echo.Echo
	StartTime  time.Time
}

//go:embed app
var appFiles embed.FS

var contentHandler = echo.WrapHandler(http.FileServer(http.FS(appFiles)))

var contentRewrite = middleware.Rewrite(map[string]string{
	"/":         "/app/index.html",
	"/*":        "/app/$1",
	"/static/*": "/app/static/$1",
	"/assets/*": "/app/assets/$1",
})

// RouteName is the name of a route
type RouteName string

const (
	// RouteWs is the websocket route
	RouteIndex RouteName = "/"
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
		// AllowHeaders: []string{"*"},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, "X-Request-ID", "X-Request-Columns", "X-Request-Continue", "access-control-allow-origin", "access-control-allow-headers"},
		// AllowOriginFunc: func(origin string) (bool, error) {
		// 	println(origin)
		// 	return false, nil
		// },
	}))

	// embedded files
	e.GET(RouteIndex.String()+"*", contentHandler, contentRewrite)

	// add routes
	for _, route := range StandardRoutes {
		route.Middlewares = append(route.Middlewares, middleware.Logger())
		route.Middlewares = append(route.Middlewares, middleware.Recover())

		e.AddRoute(route)
	}

	for _, route := range dbRestServer.StandardRoutes {
		route.Middlewares = append(route.Middlewares, middleware.Logger())
		route.Middlewares = append(route.Middlewares, middleware.Recover())

		switch route.Name {
		case "submitSQL", "submitSQL_ID", "cancelSQL", "getTableSelect":
			route.Middlewares = append(route.Middlewares, queryMiddleware)
		default:
			route.Middlewares = append(route.Middlewares, schemataMiddleware)
		}

		e.AddRoute(route)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "5987"
	}

	return &Server{
		Port:       port,
		EchoServer: e,
	}
}

// Start starts the server
func (srv *Server) Start() {
	defer srv.Close()
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigs
		srv.Close()
		os.Exit(1)
	}()

	srv.StartTime = time.Now()
	if err := srv.EchoServer.Start(":" + srv.Port); err != http.ErrServerClosed {
		g.LogFatal(g.Error(err, "could not start server"))
	}
}

// Loop cycles tasks
func (srv *Server) Loop() {
	ticker6Hours := time.NewTicker(6 * time.Hour)
	defer ticker6Hours.Stop()
	<-ticker6Hours.C
}

func (srv *Server) Hostname() string {
	return g.F("http://localhost:%s", srv.Port)
}

func (srv *Server) Close() {
	state.CloseConnections()
}
