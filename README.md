# Mullvad Ping

Gets the list of Mullvad servers with the best latency according to `ping`.

## Install

1. First
   [install Deno](https://docs.deno.com/runtime/manual/getting_started/installation),
   an open-source runtime for TypeScript and JavaScript.

2. Run the following command

```shell
deno run --allow-net=api.mullvad.net,deno.land --allow-run=ping https://raw.githubusercontent.com/grant0417/mullvad-ping/v0.7.0/script.ts
```

Note: The Windows version of `ping` is somewhat more limited than that of Linux
or Mac so the times are less precice and the script will take ~5x longer.

## Usage

```
Usage: script [OPTION]
    --country <code>      the country you want to query (eg. us, gb, de)
    --list                lists the available servers
    --list-countries      lists the available countries
    --list-providers      lists the available providers
    --type <type>         the type of server to query (openvpn, bridge, wireguard, all)
    --count <n>           the number of pings to the server (default 5)
    --top <n>             the number of top servers to show, (0=all, default 5)
    --port-speed <n>      only show servers with at least n Gigabit port speed
    --provider <name>     only show servers from the given provider
    --owned <true|false>  only show servers owned by Mullvad
    --run-mode <type>     only show servers running from (all, ram, disk)
    --include-inactive    include inactive servers
    --json                output the results in JSON format
    --help, -h            display this help and exit
```
