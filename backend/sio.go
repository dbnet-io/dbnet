package main

import (
	"fmt"
	"log"

	socketio "github.com/googollee/go-socket.io"
)

func sioServer() *socketio.Server {
	server, err := socketio.NewServer(nil)
	if err != nil {
		log.Fatal(err)
	}

	server.OnConnect("/", func(s socketio.Conn) error {
		s.SetContext("")
		fmt.Println("connected:", s.ID())
		s.Emit("customEmit", "connected:"+s.ID())
		return nil
	})

	server.OnEvent("/", "notice", func(s socketio.Conn, msg string) string {
		fmt.Println("notice:", msg)
		s.Emit("customEmit", "have "+msg)
		return "recv " + msg
	})

	server.OnEvent("/chat", "msg", func(s socketio.Conn, msg string) string {
		s.SetContext(msg)
		return "recv " + msg
	})

	server.OnEvent("/", "bye", func(s socketio.Conn) string {
		last := s.Context().(string)
		s.Emit("bye", last)
		s.Close()
		return last
	})

	server.OnError("/", func(e error) {
		fmt.Println("meet error:", e)
	})

	server.OnDisconnect("/", func(s socketio.Conn, msg string) {
		fmt.Println("closed", msg)
	})

	return server
}
