package main

// Request Payload from frontend
type Request struct {
	ReqID string                 `json:"req_id"`
	Name  string                 `json:"name"`
	Data  map[string]interface{} `json:"data"`
}

// Response from the backend
type Response struct {
	ReqID string                 `json:"req_id"`
	Name  string                 `json:"name"`
	Data  map[string]interface{} `json:"data"`
	Error string                 `json:"error"`
}
