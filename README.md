# Mullvad Ping

Gets the list of Mullvad servers with the best latency according to `ping`. To
use either download the executable or run using Deno
`deno run --allow-net --allow-run script.ts`. To generate an executable run
`deno compile --allow-net --allow-run -o mullvad-ping script.ts`.

Note: The Windows version of `ping` is somewhat more limited than that of Linux
or Mac so the times are less precice and the script will take ~5x longer.

## Usage

```
Usage: script [OPTION]
    --country <code>    the country you want to query (eg. us, gb, de)
    --list-countries    lists the available countries
    --type <type>       the type of server to query (openvpn, bridge, wireguard, all)
    --count <n>         the number of pings to the server (default 3)
    --interval <i>      the interval between pings in seconds (default/min 0.2)
    --top <n>           the number of top servers to show, (0=all)
    --port-speed <n>    only show servers with at least n Gigabit port speed             
    --help              usage information
```
