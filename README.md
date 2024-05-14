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
NAME:
   ssme - AWS ParameterStore Editor

USAGE:
   ssme [global options] command [command options]

VERSION:
   dev

COMMANDS:
   ls, list   List parameters
   cat        Display parameters with values
   vim, edit  Edit parameters with vim
   help, h    Shows a list of commands or help for one command

GLOBAL OPTIONS:
   --profile value, -p value      aws profile
   --region value, -r value       aws region
   --prefix value, -f value       prefix filter
   --max-results value, -m value  max results (default: 10)
   --help, -h                     show help
   --version, -v                  print the version
```

### Commands

- `ssme ls`
- `ssme cat`
- `ssme vim`

### `ssme ls`

List parameters from parameter store.

Usage
```
$ ssme ls 
```

Example
```
$ ssme ls -r ap-southeast-1
String           /cdk-bootstrap/xxx/version
SecureString     /acme/db
```

### `ssme cat`

Read parameters from parameter store.

Usage
```
$ ssme cat
```

Example
```
$ ssme -r ap-southeast-1 cat
/cdk-bootstrap/xxx/version=1.2.3
sec:/acme/db=mysql://root:password@db.acme.com/acme?sslaccept=strict&ssl={rejectUnauthorized:true}
```

> SecureString parameters are indicated by `sec:` prefix

### `ssme vim`

Edit parameters from parameter store in vim

Usage
```
$ ssme -r ap-southeast-1 vim
```

Example
```
$ ssme -r ap-southeast-1 vim

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
```

> You can change the parameter type by removing or adding `sec:` prefix
