package server

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/flarco/g"
	"github.com/flarco/g/net"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

// MessageType is the message type
type MessageType = net.MessageType

// request types
const (
	MsgTypeSubmitSQL      MessageType = "submit-sql"
	MsgTypeCancelSQL      MessageType = "cancel-sql"
	MsgTypeGetConnections MessageType = "get-connections"
	MsgTypeGetSchemas     MessageType = "get-schemas"
	MsgTypeGetTables      MessageType = "get-tables"
	MsgTypeGetColumns     MessageType = "get-columns"
	MsgTypeGetAnalysisSQL MessageType = "get-analysis-sql"
	MsgTypeGetHistory     MessageType = "get-history"
	MsgTypeGetSQLRows     MessageType = "get-sql-rows"
)

// Message is a message
type Message = net.Message

// WsServer is a websocket server
type WsServer struct {
	Context  g.Context
	Clients  map[string]*WsClient
	Handlers map[MessageType]func(Message) Message
}

// WsClient is a websocket client
type WsClient struct {
	ID          string
	Closed      bool
	ConnectTime time.Time
	Context     g.Context
	Conn        *websocket.Conn
	Server      *WsServer
}

// NewWsServer creates a websocket server
func NewWsServer() *WsServer {
	// handlers
	handlers := map[MessageType]func(msg Message) (respMsg Message){
		MsgTypeSubmitSQL:      handleSubmitSQL,
		MsgTypeGetSQLRows:     handleGetSQLRows,
		MsgTypeCancelSQL:      handleCancelSQL,
		MsgTypeGetConnections: handleGetConnections,
		MsgTypeGetSchemas:     handleGetSchemas,
		MsgTypeGetTables:      handleGetTables,
		MsgTypeGetColumns:     handleGetColumns,
		MsgTypeGetAnalysisSQL: handleGetAnalysisSQL,
		MsgTypeGetHistory:     handleGetHistory,
	}

	return &WsServer{
		Handlers: handlers,
		Context:  g.NewContext(context.Background(), 100),
	}
}

// NewClient creates a new client connection
func (ws *WsServer) NewClient(c echo.Context) (err error) {
	ws.Context.Lock()
	defer ws.Context.Unlock()
	upgrader := websocket.Upgrader{}

	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "Error upgrading to websocket")
	}

	clientID := g.NewTsID()
	ws.Clients[clientID] = &WsClient{
		ID:          clientID,
		ConnectTime: time.Now(),
		Context:     g.NewContext(ws.Context.Ctx),
		Conn:        conn,
		Server:      ws,
	}

	go ws.Clients[clientID].Loop()

	return
}

// SendMessage send a message and does not wait for a response
// but runs the provided replyHandler on reply
func (ws *WsServer) SendMessage(clientID string, msg Message) (err error) {

	ws.Context.Lock()
	client, ok := ws.Clients[clientID]
	ws.Context.Unlock()

	if !ok {
		return g.Error("client %s not found", clientID)
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		err = g.Error(err, "could not marshall message")
		return
	}
	err = client.writeMessage(websocket.TextMessage, msgBytes, 4)
	if err != nil {
		err = g.Error(err, "could not send message")
	}
	return
}

func (wc *WsClient) writeMessage(msgType int, data []byte, timeoutSec int) (err error) {
	wc.Context.Lock()
	defer wc.Context.Unlock()

	if wc.Closed {
		return g.Error("wc is closed")
	}

	deadline := time.Now().Add(time.Second * time.Duration(timeoutSec))
	wc.Conn.SetWriteDeadline(deadline)
	err = wc.Conn.WriteMessage(msgType, data)
	if err != nil {
		g.LogError(err, "could not write message, resetting")
	}

	return err
}

// Loop is the client main loop
func (wc *WsClient) Loop() {
	// close on return
	defer func() {
		wc.Context.Lock()
		wc.Server.Context.Lock()

		delete(wc.Server.Clients, wc.ID)
		g.LogError(wc.Conn.Close())
		wc.Closed = true

		wc.Context.Unlock()
		wc.Server.Context.Unlock()
	}()

	for {
		select {
		case <-wc.Context.Ctx.Done():
			return
		case <-wc.Server.Context.Ctx.Done():
			return
		default:
			msgType, msgBytes, err := wc.Conn.ReadMessage()
			if err != nil {
				if strings.Contains(err.Error(), "websocket: close") || strings.Contains(err.Error(), "connection reset by peer") {
					g.Debug("closing ws '%s' connection due to: %s", wc.ID, err.Error())
					return
				}
				g.LogError(err, "could not read message from %s", wc.ID)
				break
			} else if msgType == websocket.CloseMessage {
				g.Debug("received close message from %s", wc.ID)
				return
			}

			msg, err := net.NewMessageFromJSON(msgBytes)
			if err != nil {
				g.LogError(err)
				break
			}

			wc.Server.Context.Lock()
			handler, ok := wc.Server.Handlers[msg.Type]
			wc.Server.Context.Unlock()
			if !ok {
				g.LogError(g.Error("could not handle %s", msg.Type))
				break
			}

			go func() {
				// handle message
				respMsg := handler(msg)
				if respMsg.Type == net.NoReplyMsgType {
					return
				}

				respMsg.OrigReqID = msg.ReqID
				err = wc.Server.SendMessage(wc.ID, respMsg)
				if err != nil {
					g.LogError(err, "could not send response message '%s' to %s", string(respMsg.Type), wc.ID)
				}
			}()
		}
	}
}
