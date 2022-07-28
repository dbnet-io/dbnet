module github.com/flarco/scruto

go 1.16

require (
	github.com/flarco/dbio v0.3.58
	github.com/flarco/g v0.1.32
	github.com/getsentry/sentry-go v0.11.0
	github.com/gorilla/websocket v1.4.2
	github.com/jmoiron/sqlx v1.2.0
	github.com/labstack/echo/v4 v4.2.2
	github.com/skratchdot/open-golang v0.0.0-20200116055534-eef842397966
	github.com/slingdata-io/sling-cli v0.85.39
	github.com/spf13/cast v1.4.1
	github.com/stretchr/testify v1.7.5
	gopkg.in/yaml.v2 v2.4.0
	gorm.io/gorm v1.20.7
)

replace github.com/flarco/g => ../g

replace github.com/flarco/dbio => ../dbio

replace github.com/slingdata-io/sling-cli => ../sling-cli
