# YAML configuration versioning

The goal is to support making "backward incompatible" changes to YAML configs without breaking
existing deployments. Trying to maintain a single "parser" would result in a lot of
logic forks, making it hard to read and just be a maintainability nightmare.

At a high level, the way it works is that all YAML configs have a "version" comment at the
top of the file. If there is no version, we assume the latest. The appropriate parser is used to
build the `ConfigData`. When a user makes a change to their config using the GUI, the `serializer`
builds a new YAML config in the latest versions schema -- automatically upgrading it to the latest
format.

## When a new version is needed

Do not create a new version for every new addition to the YAML config parser -- only create one when there's a
backward incompatible change in the structure of the YAML file or if you findyourself doing some crazy logic to
maintain backward compatibility.

## Unsupported versions

Configurations declaring an unsupported version are rejected with an error rather than attempting to parse
them using another version.

## Note on habit_configs db entry.

YAML versions are separate from the database's config revision numbers -- tbh there's no longer a
need for the version number in that table -- arguably there's little need for the table altogether.

For context the original thought was the applications version number would be stored with every new
modification of a configuration. This could have been used to lookup an appropriate parser, or be helpful
for debugging at what point a parser broke. This is all kinda less helpful with the implementation of this
"configuration normalization" method.
