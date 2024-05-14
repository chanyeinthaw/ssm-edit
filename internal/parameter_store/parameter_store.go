package parameter_store

type ConfigLoader interface {
	Load() interface{}
}

type ParameterStore interface {
	Init(cfg ConfigLoader) error
	DescribeParameters(options Options) ([]Parameter, error)
	GetParameters(names []string) ([]ParameterWithValue, error)
	DeleteParameters(names []string) error
	PutParameters(parameters []ParameterWithValue) error
}

type Options struct {
	MaxResults *int32
	Cursor     *string
	Prefix     *string
}

type Parameter struct {
	Name string
	Type string
}

type ParameterWithValue struct {
	Parameter
	Value string
}
