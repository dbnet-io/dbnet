module github.com/flarco/scruto

go 1.16

require (
	github.com/flarco/dbio v0.0.3
	github.com/flarco/g v0.0.2
	github.com/gorilla/websocket v1.4.2
	github.com/jmoiron/sqlx v1.2.0
	github.com/labstack/echo/v4 v4.2.2
	github.com/spf13/cast v1.3.1
	github.com/stretchr/testify v1.7.0
	gopkg.in/yaml.v3 v3.0.0-20210107192922-496545a6307b
	gorm.io/gorm v1.20.7
)

replace github.com/flarco/g => ../g

replace github.com/flarco/dbio => ../dbio
