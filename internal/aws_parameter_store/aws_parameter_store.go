package aws_parameter_store

import (
	"context"
	"sync"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/aws/aws-sdk-go-v2/service/ssm/types"
	ps "github.com/chanyeinthaw/ssme/internal/parameter_store"
)

type Store struct {
	client *ssm.Client
}

type Config struct {
	Region  *string
	Profile *string
}

func New(cfg Config) (*Store, error) {
	store := &Store{}
	optFns := make([]func(*config.LoadOptions) error, 0)

	if cfg.Region != nil {
		optFns = append(optFns, config.WithRegion(*cfg.Region))
	}

	if cfg.Profile != nil {
		optFns = append(optFns, config.WithSharedConfigProfile(*cfg.Profile))
	}

	awsConfig, err := config.LoadDefaultConfig(
		context.TODO(),
		optFns...,
	)

	if err != nil {
		return nil, err
	}

	store.client = ssm.NewFromConfig(awsConfig)

	return store, nil
}

const GET_PARAMETERS_MAX_NAMES = 10

func (s *Store) DescribeParameters(options ps.Options) ([]ps.Parameter, error) {
	maxResults := int32(10)
	if options.MaxResults != nil {
		maxResults = *options.MaxResults
	}

	input := &ssm.DescribeParametersInput{
		MaxResults: &maxResults,
	}

	if options.Prefix != nil && *options.Prefix != "" {
		key := "Name"
		option := "BeginsWith"

		input.ParameterFilters = append(input.ParameterFilters, types.ParameterStringFilter{
			Key:    &key,
			Option: &option,
			Values: []string{*options.Prefix},
		})
	}

	out, err := s.client.DescribeParameters(context.TODO(), input)
	if err != nil {
		return nil, err
	}

	parameters := make([]ps.Parameter, 0)
	for _, p := range out.Parameters {
		parameters = append(parameters, ps.Parameter{
			Name: *p.Name,
			Type: string(p.Type),
		})
	}

	return parameters, nil
}

func (s *Store) GetParameters(names []string) ([]ps.ParameterWithValue, error) {
	wg := &sync.WaitGroup{}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	params := make(chan ps.ParameterWithValue, len(names))
	errs := make(chan error, 2)

	for i := 0; i < len(names); i += GET_PARAMETERS_MAX_NAMES {
		var _names []string
		if i+GET_PARAMETERS_MAX_NAMES > len(names) {
			_names = names[i:]
		} else {
			_names = names[i : i+GET_PARAMETERS_MAX_NAMES]
		}

		wg.Add(1)
		go func() {
			defer wg.Done()

			withDecription := true
			input := &ssm.GetParametersInput{
				Names:          _names,
				WithDecryption: &withDecription,
			}

			out, err := s.client.GetParameters(ctx, input)
			if err != nil {
				errs <- err
				cancel()
				return
			}

			for _, p := range out.Parameters {
				params <- ps.ParameterWithValue{
					Parameter: ps.Parameter{
						Name: *p.Name,
						Type: string(p.Type),
					},
					Value: *p.Value,
				}
			}
		}()
	}

	wg.Wait()
	close(params)
	close(errs)

	if ctx.Err() != nil {
		return nil, <-errs
	}

	parameters := make([]ps.ParameterWithValue, 0)
	for param := range params {
		parameters = append(parameters, param)
	}

	return parameters, nil
}

func (s *Store) DeleteParameters(names []string) error {
	wg := &sync.WaitGroup{}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	errs := make(chan error, 2)

	for i := 0; i < len(names); i += 1 {
		wg.Add(1)

		name := names[i]
		go func() {
			defer wg.Done()

			input := &ssm.DeleteParameterInput{
				Name: &name,
			}

			_, err := s.client.DeleteParameter(ctx, input)
			if err != nil {
				errs <- err
				cancel()
			}
		}()
	}

	wg.Wait()
	close(errs)

	if ctx.Err() != nil {
		return <-errs
	}

	return nil
}

func (s *Store) PutParameters(params []ps.ParameterWithValue) error {
	wg := &sync.WaitGroup{}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	errs := make(chan error, 2)

	for i := 0; i < len(params); i += 1 {
		wg.Add(1)
		param := params[i]
		go func() {
			defer wg.Done()

			parameterType := types.ParameterTypeString
			if param.Type == "SecureString" {
				parameterType = types.ParameterTypeSecureString
			}

			overwrite := true
			input := &ssm.PutParameterInput{
				Name:      &param.Name,
				Value:     &param.Value,
				Type:      parameterType,
				Overwrite: &overwrite,
			}

			_, err := s.client.PutParameter(ctx, input)
			if err != nil {
				errs <- err
				cancel()
			}
		}()
	}

	wg.Wait()
	close(errs)

	if ctx.Err() != nil {
		return <-errs
	}

	return nil
}
