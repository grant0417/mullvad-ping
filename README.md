# Mullvad Ping

Gets the list of Mullvad servers with the best latency according to `ping`.

## Running

1. First
   [install Deno](https://docs.deno.com/runtime/manual/getting_started/installation),
   an open-source runtime for TypeScript and JavaScript.

2. Run the following command

```shell
deno run --allow-net=api.mullvad.net,deno.land --allow-run=ping https://raw.githubusercontent.com/grant0417/mullvad-ping/v0.8.0/script.ts
```

3. Alternatively, you can download a compiled release from the
   [releases page](https://github.com/grant0417/mullvad-ping/releases/).

Note: The Windows version of `ping` is somewhat more limited than that of Linux
or Mac so the times are less precise and the script will take ~5x longer.

## CLI Usage

```
Usage: mullvad-ping [OPTIONS]

Options:
  -c, --country <CODE>      the country you want to query (eg. us, gb, de)
  -l, --list                lists the available servers
      --list-countries      lists the available countries
      --list-providers      lists the available providers
  -t, --type <TYPE>         the type of server to query (openvpn, bridge, wireguard, all)
  -C, --count <COUNT>       the number of pings to the server (default 5)
  -n, --top <TOPN>          the number of top servers to show, (0=all, default 5)
  -s, --port-speed <SPEED>  only show servers with at least n Gbps port speed
  -p, --provider <NAME>     only show servers from the given provider
      --owner <OWNER>       only show servers by owner (mullvad, rented, all)
      --run-mode <TYPE>     only show servers running from (ram, disk, all)
      --include-inactive    include inactive servers
  -j, --json                output the results in JSON format
  -h, --help                display this help and exit
  -V, --version             display version information and exit
```
