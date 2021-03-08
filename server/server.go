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
	RouteWs RouteName = "/ws"
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
	return &Server{
		Port:       "5987",
		EchoServer: e,
		WsServer:   wsServer,
		StartTime:  time.Now(),
	}
}
