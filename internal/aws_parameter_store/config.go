package aws_parameter_store

type Config struct {
	region  *string
	profile *string
}

func NewConfig(region *string, profile *string) *Config {
	return &Config{
		region:  region,
		profile: profile,
	}
}

func (c *Config) Load() interface{} {
	return c
}
