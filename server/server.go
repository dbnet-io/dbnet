package server

import (
	"embed"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/flarco/g"
	"github.com/flarco/g/net"
	"github.com/flarco/g/process"
	"github.com/flarco/scruto/store"
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
	DbtServer  *process.Proc
}

//go:embed app
var appFiles embed.FS

// RouteName is the name of a route
type RouteName string

const (
	// RouteWs is the websocket route
	RouteIndex           RouteName = "/"
	RouteWs              RouteName = "/ws"
	RouteSubmitSQL       RouteName = "/submit-sql"
	RouteSubmitDbt       RouteName = "/submit-dbt"
	RouteCancelSQL       RouteName = "/cancel-sql"
	RouteExtractLoad     RouteName = "/extract-load"
	RouteGetSettings     RouteName = "/get-settings"
	RouteGetConnections  RouteName = "/get-connections"
	RouteGetDatabases    RouteName = "/get-databases"
	RouteGetSchemata     RouteName = "/get-schemata"
	RouteGetSchemas      RouteName = "/get-schemas"
	RouteGetTables       RouteName = "/get-tables"
	RouteGetColumns      RouteName = "/get-columns"
	RouteGetAnalysisSQL  RouteName = "/get-analysis-sql"
	RouteGetHistory      RouteName = "/get-history"
	RouteGetSQLRows      RouteName = "/get-sql-rows"
	RouteGetCachedResult RouteName = "/get-cached-result"
	RouteLoadSession     RouteName = "/load-session"
	RouteSaveSession     RouteName = "/save-session"
	RouteFileOperation   RouteName = "/file-operation"
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

	// CORS
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:5987", "tauri://localhost"},
		// AllowCredentials: true,
		// AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept},
	}))

	// embedded files
	contentHandler := echo.WrapHandler(http.FileServer(http.FS(appFiles)))
	contentRewrite := middleware.Rewrite(map[string]string{"/*": "/app/$1"})

	// websocket server
	wsServer := NewWsServer()

	e.GET(RouteWs.String(), wsServer.NewClient)

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
	e.GET(RouteGetSQLRows.String(), GetSQLRows)
	e.GET(RouteGetCachedResult.String(), GetCachedResult)
	e.GET(RouteLoadSession.String(), GetLoadSession)

	e.POST(RouteSubmitSQL.String(), PostSubmitQuery)
	e.POST(RouteExtractLoad.String(), PostSubmitExtractLoadJob)
	e.POST(RouteSubmitDbt.String(), PostSubmitDbt)
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
		WsServer:   wsServer,
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

	srv.EchoServer.Logger.Fatal(srv.EchoServer.Start(":" + srv.Port))
}

// Cleanup cleans up
func (srv *Server) Cleanup() {
	// clean up all dbt servers
	mux.Lock()
	defer mux.Unlock()
	toDel := []string{}
	for key, s := range DbtServers {
		g.Debug("killing %d", s.Proc.Cmd.Process.Pid)
		g.LogError(s.Proc.Cmd.Process.Kill())
		toDel = append(toDel, key)
	}

	for _, key := range toDel {
		delete(DbtServers, key)
	}
}

// Loop cycles tasks
func (srv *Server) Loop() {
	ticker6Hours := time.NewTicker(6 * time.Hour)
	defer ticker6Hours.Stop()
	for {
		select {
		case <-ticker6Hours.C:
			g.LogError(store.Db.Where("updated_dt < ?", time.Now().Add(-24*3*time.Hour)).Delete(&store.QueryRow{}).Error)
		}
	}
}

type DbtServer struct {
	ProjDir string
	Profile string
	Host    string
	Port    int
	Proc    *process.Proc
	LastTs  time.Time
	timer   *time.Timer
}

func NewDbtServer(projDir, profile string) *DbtServer {
	s := &DbtServer{
		ProjDir: projDir,
		Profile: profile,
		Host:    "0.0.0.0",
	}

	s.timer = time.AfterFunc(1*time.Hour, func() {
		g.Debug("killing dbt server after 1h idle -> %s", s.Key())
		g.LogError(s.Proc.Cmd.Process.Kill())
		mux.Lock()
		delete(DbtServers, s.Key())
		mux.Unlock()
	})

	mux.Lock()
	DbtServers[s.Key()] = s
	mux.Unlock()

	s.TouchTs()
	return s
}

// Key returns the key
func (s *DbtServer) Key() string {
	return strings.ToLower(g.F("%s|%s", s.Profile, s.ProjDir))
}

// Hostname returns the hostname
func (s *DbtServer) Hostname() string {
	return g.F("%s:%d", s.Host, s.Port)
}

type dbtRequest struct {
	ID      string `json:"id"`
	JsonRPC string `json:"jsonrpc"`
	Method  string `json:"method"`
	Params  g.Map  `json:"params"`
}

type dbtResponse struct {
	ID      string `json:"id"`
	JsonRPC string `json:"jsonrpc"`
	Result  g.Map  `json:"result"`
}

// Submit submits a request to RPC
func (s *DbtServer) Submit(req dbtRequest) (dbtResp dbtResponse, err error) {
	s.TouchTs()

	headers := map[string]string{"Content-Type": "application/json"}
	url := g.F("http://%s:%d/jsonrpc", s.Host, s.Port)

	_, respBytes, err := net.ClientDo("POST", url, strings.NewReader(g.Marshal(req)), headers, 5*60*60)
	if err != nil {
		err = g.Error(err, "error submitting RPC request")
		return
	}

	err = g.Unmarshal(string(respBytes), &dbtResp)
	if err != nil {
		err = g.Error(err, "error parsing RPC response")
		return
	}
	return
}

// TouchTs sets last timestamp and resets kill timer
func (s *DbtServer) TouchTs() {
	s.LastTs = time.Now()
	if s.timer != nil {
		if !s.timer.Stop() {
			<-s.timer.C
		}
		s.timer.Reset(1 * time.Hour)
	}
}

// Hostname returns the hostname
func (s *DbtServer) ProjName() string {
	arr := strings.Split(s.ProjDir, "/")
	if len(arr) > 0 {
		return arr[len(arr)-1]
	}
	return s.ProjDir
}

// Launch runs a dbt server
func (s *DbtServer) Launch() (err error) {

	s.Port, err = g.GetPort(s.Host + ":0")
	if err != nil {
		err = g.Error(err, "could not open port")
		return
	}

	s.Proc, err = process.NewProc(
		"dbt", "rpc",
		"--host", s.Host,
		"--port", cast.ToString(s.Port),
		"--profile", s.Profile,
		"--project-dir", s.ProjDir,
	)

	scanner := func(stderr bool, text string) {
		g.Debug("%s -- %s -- %s", s.ProjName(), s.Profile, text)
	}

	if err != nil {
		err = g.Error(err, "error launching RPC server")
	} else {
		s.Proc.SetScanner(scanner)
		go s.Proc.Start()
		g.Debug(s.Proc.CmdStr())
		g.Info("started dbt rpc server @ %s:%d", s.Host, s.Port)
		for i := 1; i <= 5; i++ {
			req := dbtRequest{
				ID:      cast.ToString(i),
				JsonRPC: "2.0",
				Method:  "status",
			}
			_, err := s.Submit(req)
			if err == nil {
				break
			} else {
				time.Sleep(time.Duration(i) * time.Second)
			}
		}
	}

	return
}

// Refresh refreshes files list
func (s *DbtServer) Refresh() {
	err := syscall.Kill(s.Proc.Cmd.Process.Pid, syscall.SIGHUP)
	g.LogError(err)
}
