package main

import (
	"log"
	"os"

	"github.com/chanyeinthaw/ssme/internal/command_actions"
	"github.com/urfave/cli/v2"
)

var Version = "dev"

func main() {
	app := &cli.App{
		Version:              Version,
		Suggest:              true,
		EnableBashCompletion: true,
		Name:                 "ssme",
		Usage:                "AWS ParameterStore Editor",
		Flags: []cli.Flag{
			&cli.StringFlag{
				Name:    "profile",
				Aliases: []string{"p"},
				Usage:   "aws profile",
			},
			&cli.StringFlag{
				Name:    "region",
				Aliases: []string{"r"},
				Usage:   "aws region",
			},
			&cli.StringFlag{
				Name:    "prefix",
				Aliases: []string{"f"},
				Usage:   "prefix filter",
			},
			&cli.IntFlag{
				Name:    "max-results",
				Aliases: []string{"m"},
				Usage:   "max results",
				Value:   10,
			},
		},

		Action: command_actions.RootCommandAction,

		Commands: []*cli.Command{
			{
				Name:    "ls",
				Aliases: []string{"list"},
				Usage:   "List parameters",
				Action:  command_actions.ListCommandAction,
			},
			{
				Name:   "cat",
				Usage:  "Display parameters with values",
				Action: command_actions.CatCommandAction,
			},
			{
				Name:    "vim",
				Aliases: []string{"edit"},
				Usage:   "Edit parameters with vim",
				Action:  command_actions.VimCommandAction,
			},
		},
	}

	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}
