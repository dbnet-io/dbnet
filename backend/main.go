package main

import (
	"net/http"

	"github.com/gobuffalo/packr"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	"gopkg.in/olahol/melody.v1"
)

func main() {

	server := sioServer()
	go server.Serve()
	defer server.Close()

	e := echo.New()
	m := melody.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	// e.Any("/socket.io/", echo.WrapHandler(server))

	e.GET("/ws", func(c echo.Context) error {
		m.HandleRequest(c.Response().Writer, c.Request())
		return nil
	})

	m.HandleConnect(func(s *melody.Session) {
		// s.Write([]byte("connect!"))
	})
	m.HandleSentMessage(func(s *melody.Session, msg []byte) {
		println("sent -> " + string(msg))
	})

	m.HandleMessage(func(s *melody.Session, msg []byte) {
		println(string(msg))
		m.Broadcast(msg)
	})

	staticBox := packr.NewBox("static")
	e.GET("/*", echo.WrapHandler(http.FileServer(staticBox)))

	// e.Static("/", "static")

	e.GET("/api/hello", func(c echo.Context) error {
		return c.String(http.StatusOK, "+ Echo Server!")
	})
	e.Logger.Fatal(e.Start(":9999"))
}
