# Mullvad Ping

Gets the list of Mullvad servers with the best latency according to `ping`. 
To use either download the Linux executable or run using Deno
`deno run --allow-net --allow-run script.ts`.

## Usage

```
Usage: script [OPTION]
    --country <code>    the country you want to quary (eg. us, gb, de)
    --list-countries    lists the avaiable countries
    --type <type>       the type of server to quary (openvpn, bridge, wireguard, all)
    --count <n>         the number of pings to the server (default 3)
    --interval <i>      the interval between pings in seconds (default/min 0.2)
    --top <n>           the number of top servers to show, (0=all)
    --help              usage infromation
```
