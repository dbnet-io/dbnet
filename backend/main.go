package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"

	x "github.com/flarco/gxutil"
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
		var request Request
		if err := json.Unmarshal(msg, &request); err != nil {
			x.Check(err, "Could not Unmarshal -> "+string(msg))
		}
		response := runFunc(request)
		responseJSON, _ := json.Marshal(response)

		// m.Broadcast(responseJSON)

		// Return to sender
		m.BroadcastFilter(responseJSON, func(q *melody.Session) bool {
			return q.Request.URL.Path == s.Request.URL.Path
		})
	})

	staticBox := packr.NewBox("static")
	e.GET("/*", echo.WrapHandler(http.FileServer(staticBox)))

	// e.Static("/", "static")

	e.GET("/api/hello", func(c echo.Context) error {
		return c.String(http.StatusOK, "+ Echo Server!")
	})
	e.Logger.Fatal(e.Start(":9999"))
}


func execSQL(sql string) (string, error) {
	conn := x.Connection{
		URL: os.Getenv("POSTGRES_URL"),
	}
	err := conn.Connect()
	if err != nil {
		return "", err
	}

	data, err := conn.Query(sql)
	if err != nil {
		return "", err
	}

	// x.PrintV(data.Records)

	buf := new(bytes.Buffer)
	enc := json.NewEncoder(buf)
	err = enc.Encode(data.Records)
	x.PrintV(buf.String())
	println()

	return buf.String(), err

}
