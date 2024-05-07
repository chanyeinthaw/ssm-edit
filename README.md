# ssme

AWS SSM ParameterStore UI **SUCKS**! I made this to ease my pain. 

# Configuration

You need to configure aws credentials @ `~/.aws/credentials` or set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in env vars.

## Installation

```bash
bun add -g ssme
-- or -- 
npm install -g ssme
```

## Usage 

```bash
$ ssme [options] [command]

Arguments:
  command                         Command to run (choices: "ls", "cat", "vim", default: "ls")

Options:
  -e, --use-env                   Use credentials from environment variables
  -m, --max-results <max-result>  Max results (default: 10)
  -f, --prefix <prefix>           Prefix filter
  -p, --profile <profile>         AWS Profile (default: "default")
  -r, --region <region>           AWS Region
  -h, --help                      display help for command
```

### Commands

- `ssme ls`
- `ssme cat`
- `ssme vim`

### `ssme ls`

List parameters from parameter store.

Usage
```
$ ssme ls -r ap-southeast-1
```

Example
```
$ ssme ls -r ap-southeast-1
String               /cdk-bootstrap/xxx/version
SecureString         /acme/db
```

### `ssme cat`

Read parameters from parameter store.

Usage
```
$ ssme cat -r ap-southeast-1
```

Example
```
$ ssme cat -r ap-southeast-1
/cdk-bootstrap/xxx/version=1.2.3
sec:/acme/db=mysql://root:password@db.acme.com/acme?sslaccept=strict&ssl={rejectUnauthorized:true}
```

> SecureString parameters are indicated by `sec:` prefix

### `ssme vim`

Edit parameters from parameter store in vim

Usage
```
$ ssme vim -r ap-southeast-1
```

Example
```
$ ssme vim -r ap-southeast-1

-- vim -- 
/cdk-bootstrap/xxx/version=1.2.3
sec:/acme/db=mysql://root:password@db.acme.com/acme?sslaccept=strict&ssl={rejectUnauthorized:true}
-- vim --

Original ---
/cdk-bootstrap/xxx/version=1.2.3
sec:/acme/db=mysql://root:password@db.acme.com/acme?sslaccept=strict&ssl={rejectUnauthorized:true}
Updated ---
/cdk-bootstrap/xxx/version=1.2.3
/acme/db=mysql://root:password@db.acme.com/acme?sslaccept=strict&ssl={rejectUnauthorized:true}

Do you want to apply these changes? (y/n)
Saved: 1
```

> You can change the parameter type by removing or adding `sec:` prefix
