package sentry

import (
	"github.com/getsentry/sentry-go"
	sentryecho "github.com/getsentry/sentry-go/echo"

	"github.com/labstack/echo/v4"
)

var (
	Version = "0.1"
)

func init() {
	sentry.Init(sentry.ClientOptions{
		// Either set your DSN here or set the SENTRY_DSN environment variable.
		Dsn: "https://d6b440f7646e4fdcacfa27dd59a659c5@o794636.ingest.sentry.io/5801619",
		// Either set environment and release here or set the SENTRY_ENVIRONMENT
		// and SENTRY_RELEASE environment variables.
		// Environment: "",
		Release: "dbnet@" + Version,
		// Enable printing of SDK debug messages.
		// Useful when getting started or trying to figure something out.
		Debug: false,
	})
}

func SentryEcho() echo.MiddlewareFunc {
	return sentryecho.New(sentryecho.Options{
		Repanic: true,
	})
}
