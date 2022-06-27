package log

import (
	"github.com/spf13/cobra"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

const (
	cmdLogLevel   = "log-level"
	cmdLogOutputs = "log-outputs"
)

var L *zap.SugaredLogger

func init() {
	logger, err := zap.NewProduction()
	if err != nil {
		panic(err)
	}
	L = logger.Sugar()
}

func Setup(level zapcore.Level, logOutputs []string) error {
	config := zap.NewProductionConfig()
	config.Level = zap.NewAtomicLevelAt(level)
	config.OutputPaths = logOutputs
	logger, err := config.Build()
	if err != nil {
		return err
	}
	L = logger.Sugar()
	return nil
}

func AddFlagsForCmd(cmd *cobra.Command) {
	cmd.Flags().String(cmdLogLevel, "info", "logging level (debug|info|warn|error|dpanic|panic|fatal)")
	cmd.Flags().StringArray(cmdLogOutputs, []string{"stderr"}, "logging outputs")
}

func SetupFromCmd(cmd *cobra.Command) error {
	levelStr, err := cmd.Flags().GetString(cmdLogLevel)
	if err != nil {
		return err
	}
	level, err := zapcore.ParseLevel(levelStr)
	if err != nil {
		return err
	}
	logOutputs, err := cmd.Flags().GetStringArray(cmdLogOutputs)
	if err != nil {
		return err
	}
	return Setup(level, logOutputs)
}
