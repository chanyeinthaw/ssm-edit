package command_actions

import (
	"bufio"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/chanyeinthaw/ssme/internal/aws_parameter_store"
	ps "github.com/chanyeinthaw/ssme/internal/parameter_store"
	"github.com/urfave/cli/v2"
)

var store ps.ParameterStore

func initStore(ctx *cli.Context) {
	profile := ctx.String("profile")
	region := ctx.String("region")

	var profilePtr *string
	var regionPtr *string

	if profile != "" {
		profilePtr = &profile
	}

	if region != "" {
		regionPtr = &region
	}

	awsStore, err := aws_parameter_store.New(aws_parameter_store.Config{
		Region:  regionPtr,
		Profile: profilePtr,
	})

	store = awsStore

	if err != nil {
		fmt.Println("Error initializing store")
		os.Exit(1)
	}
}

func RootCommandAction(ctx *cli.Context) error {
	initStore(ctx)
	return ListCommandAction(ctx)
}

func listParameters(ctx *cli.Context) (string, []string) {
	maxResults := int32(ctx.Int("max-results"))
	prefix := ctx.String("prefix")

	parameters, err := store.DescribeParameters(ps.Options{
		MaxResults: &maxResults,
		Prefix:     &prefix,
	})
	if err != nil {
		fmt.Println("Error listing parameters", err)
		os.Exit(1)
	}

	names := make([]string, 0)
	list := ""
	for _, parameter := range parameters {
		names = append(names, parameter.Name)
		list += fmt.Sprintf("%s\t\t%s\n", parameter.Type, parameter.Name)
	}

	return list, names
}

func ListCommandAction(ctx *cli.Context) error {
	initStore(ctx)

	list, _ := listParameters(ctx)
	fmt.Print(list)

	return nil
}

func catParameters(ctx *cli.Context) string {
	_, names := listParameters(ctx)
	parameters, err := store.GetParameters(names)

	if err != nil {
		fmt.Println("Error reading parameters")
		os.Exit(1)
	}

	result := ""
	for _, parameter := range parameters {
		secret := ""
		if parameter.Type == "SecureString" {
			secret = "sec:"
		}
		result += fmt.Sprintf("%s%s=%s\n", secret, parameter.Name, parameter.Value)
	}

	return result
}

func CatCommandAction(ctx *cli.Context) error {
	initStore(ctx)
	result := catParameters(ctx)

	fmt.Print(result)

	return nil
}

func editWithVim(content string) string {
	tempFilePath := filepath.Join(os.TempDir(), fmt.Sprintf("envs-%s.txt", time.Now().Format(time.RFC3339)))
	err := ioutil.WriteFile(tempFilePath, []byte(content), 0644)
	if err != nil {
		fmt.Printf("Error writing to file: %v\n", err)
		os.Exit(1)
	}

	cmd := exec.Command("vim", tempFilePath)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	err = cmd.Run()
	if err != nil {
		fmt.Printf("Error running vim: %v\n", err)
		os.Remove(tempFilePath) // Remove the temporary file
		os.Exit(1)
	}

	updatedContent, err := ioutil.ReadFile(tempFilePath)
	if err != nil {
		fmt.Printf("Error reading file: %v\n", err)
		os.Remove(tempFilePath) // Remove the temporary file
		os.Exit(1)
	}

	err = os.Remove(tempFilePath)
	if err != nil {
		fmt.Printf("Error removing file: %v\n", err)
		os.Exit(1)
	}

	return string(updatedContent)
}

func makeMap(content string) map[string]string {
	lines := strings.Split(content, "\n")
	m := make(map[string]string)
	for _, line := range lines {
		if line == "" {
			continue
		}
		parts := strings.Split(line, "=")

		if len(parts) < 2 {
			continue
		}

		key := parts[0]
		value := parts[1]

		m[key] = value
	}
	return m
}

func VimCommandAction(ctx *cli.Context) error {
	initStore(ctx)
	content := catParameters(ctx)
	updatedContent := editWithVim(content)

	fmt.Printf("Original ---\n%s\nUpdated---\n%s\n", content, updatedContent)
	fmt.Printf("Do you want to save the changes? [y/n]: ")

	reader := bufio.NewReader(os.Stdin)
	input, err := reader.ReadString('\n')
	if err != nil {
		return nil
	}

	input = strings.TrimSpace(input)
	if !(input == "y" || input == "Y") {
		return nil
	}

	// diff the content
	original := makeMap(content)
	updated := makeMap(updatedContent)

	namesToDelete := make([]string, 0)
	namesToDeleteMap := make(map[string]bool)
	for key := range original {
		if strings.HasPrefix(key, "sec:") {
			noSecKey := strings.TrimPrefix(key, "sec:")

			_, ok := updated[noSecKey]
			_, secOk := updated[key]

			if !ok && !secOk {
				namesToDelete = append(namesToDelete, key)
				namesToDeleteMap[key] = true
			}
		} else {
			secKey := fmt.Sprintf("sec:%s", key)

			_, ok := updated[key]
			_, secOk := updated[secKey]

			if !ok && !secOk {
				namesToDelete = append(namesToDelete, key)
				namesToDeleteMap[key] = true
			}
		}
	}

	namesToPut := make([]string, 0)
	for key := range updated {
		_, inDeleteList := namesToDeleteMap[key]
		if !inDeleteList && updated[key] != original[key] {
			namesToPut = append(namesToPut, key)
		}
	}

	for i, name := range namesToDelete {
		namesToDelete[i] = strings.TrimPrefix(name, "sec:")
	}

	err = store.DeleteParameters(namesToDelete)
	if err != nil {
		fmt.Println("Error deleting parameters")
		os.Exit(1)
	}

	parameters := make([]ps.ParameterWithValue, 0)
	for _, name := range namesToPut {
		value := updated[name]

		pType := "String"
		if strings.HasPrefix(name, "sec:") {
			pType = "SecureString"
		}

		parameter := ps.ParameterWithValue{
			Parameter: ps.Parameter{
				Name: strings.TrimPrefix(name, "sec:"),
				Type: pType,
			},
			Value: value,
		}
		parameters = append(parameters, parameter)
	}

	err = store.PutParameters(parameters)
	if err != nil {
		fmt.Println("Error putting parameters")
		os.Exit(1)
	}

	return nil
}
